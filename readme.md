# Docker + Node 
Sample node application using docker.

# Docker Image build

```powershell
git clone <<repo>>
cd << repo>>
docker --version
docker build -t sample_node:latest .
docker images --filter=reference='sample*'
```

## To run locally 

```
docker run -d -p 80:8080 sample_node:latest
```
verify from browser via `http://localhost/`

# Publish the image to **private registry**

Example: To publish the builded image to AWS ECR repo.

```powershell
*** pre Req***
Import-Module -Name AWSPowerShell
Get-Module -Name AWSPowerShell

*** 1.login to AWS poweshell Module ***
Set-AWSCredential 
--verify with `Get-AWSCredential`

*** 2. create new ECR repo **
$RepositoryName="sample_node"
New-ECRRepository -RepositoryName $RepositoryName -ImageTagMutability IMMUTABLE -ImageScanningConfiguration_ScanOnPush $true

*** 3. Tag the docker image **
$ECRRepository=(Get-ECRRepository -RepositoryName $RepositoryName).RepositoryUri
docker tag sample_node:latest ${ECRRepository}:latest

*** 4. push the image to AWS ECR repo **
(Get-ECRLoginCommand).Password | docker login --username AWS --password-stdin (Get-ECRLoginCommand).Endpoint
docker push ${ECRRepository}:latest

```

###  To Remove Image & ECR repo**

```powershell
$ImageId=(Get-ECRImage -RepositoryName $RepositoryName)
Remove-ECRImageBatch -RepositoryName $RepositoryName -ImageId $ImageId

***To Remove ECR repo ***

Remove-ECRRepository -RepositoryName $RepositoryName
```

# Create ASG 

```powershell

*** verify below details *** if not create them 
Get-IAMInstanceProfileForRole -RoleName ecsInstanceRole
Get-EC2KeyPair -KeyName MyKeyPair
Get-EC2SecurityGroup -GroupId sg-082bb5832a24d0333

** 1. create launch config**
$IAM_ARN=(Get-IAMInstanceProfileForRole -RoleName ecsInstanceRole).Arn
--- create userdata.txt file with ---
#!/bin/bash
echo ECS_CLUSTER=node-cluster >> /etc/ecs/ecs.config;echo ECS_BACKEND_HOST= >> /etc/ecs/ecs.config;
--------
$userdata=Get-Content ".\userdata.txt";$Bytes=[System.Text.Encoding]::UTF8.GetBytes($userdata);$Encoded_userdata = [System.Convert]::ToBase64String($Bytes)
New-ASLaunchConfiguration -LaunchConfigurationName node-lc -InstanceType "t2.micro" -ImageId "ami-029bf83e14803c25f" -SecurityGroup "sg-082bb5832a24d0333" -KeyName "MyKeyPair" -IamInstanceProfile $IAM_ARN -AssociatePublicIpAddress $true -UserData $Encoded_userdata

aws autoscaling describe-launch-configurations --launch-configuration-names node-lc --region ap-southeast-2

**2.create Auto-scaling group**
New-ASAutoScalingGroup -AutoScalingGroupName node-asg -LaunchConfigurationName node-lc -MinSize 0 -MaxSize 2 -AvailabilityZone @("ap-southeast-2a", "ap-southeast-2c") -VPCZoneIdentifier 'subnet-0d0a667209c85e337,subnet-070a2407837b46f8d' -NewInstancesProtectedFromScaleIn $true

aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names node-asg --region ap-southeast-2
```

###  To Remove ASG and LC**

```powershell
Remove-ASLaunchConfiguration -LaunchConfigurationName node-lc -force
Remove-ASAutoScalingGroup -AutoScalingGroupName node-asg -ForceDelete $true -force
```

## ECS resource and Cluster creation
```powershell
$ASG_ARN=(Get-ASAutoScalingGroup -AutoScalingGroupName node-asg).AutoScalingGroupARN

New-ECSCapacityProvider -Name node-cp -AutoScalingGroupProvider_AutoScalingGroupArn $ASG_ARN -ManagedScaling_MaximumScalingStepSize 1 -ManagedScaling_MinimumScalingStepSize 1 -ManagedScaling_Status ENABLED -ManagedScaling_TargetCapacity 100

New-ECSCluster -ClusterName node-cluster -CapacityProvider node-cp -DefaultCapacityProviderStrategy @{capacityProvider="node-cp";weight=1;base=1}

aws ecs describe-clusters --clusters node-cluster --include ATTACHMENTS --region ap-southeast-2
aws ecs put-cluster-capacity-providers --cluster node-cluster --capacity-providers node-cp1 --default-capacity-provider-strategy capacityProvider=node-cp,weight=1,base=1

```

###  To Remove ECS cluster**

```powershell
Remove-ECSCluster -Cluster node-cluster -force
```
# AWS cli approach 
```
PS C:\muthu> Get-Content capacityprovider.json
{
    "name": "node-capacityprovider",
    "autoScalingGroupProvider": {
        "autoScalingGroupArn": "arn:aws:autoscaling:ap-southeast-2:873169456713:autoScalingGroup:38dcf7d2-5510-42ee-8f69-05c7c656e659:autoScaling
GroupName/node-asg",
        "managedScaling": {
            "status": "ENABLED",
            "targetCapacity": 100,
            "minimumScalingStepSize": 1,
            "maximumScalingStepSize": 100
        },
        "managedTerminationProtection": "ENABLED"
    }
}

aws ecs create-capacity-provider --cli-input-json file://capacityprovider.json --region ap-southeast-2
aws ecs create-cluster --cluster-name node-cluster --capacity-providers node-capacityprovider --default-capacity-provider-strategy capacityProvider=node-capacityprovider,weight=1 --region ap-southeast-2

Get-Content taskdef.json
{
    "family": "node-taskdef",
    "containerDefinitions": [
      {
        "essential": true,
        "image": "873169456713.dkr.ecr.ap-southeast-2.amazonaws.com/sample_node:latest",
        "memory": 1,
        "name": "test-container",
        "portMappings": [
           {
                    "hostPort": 80,
                    "containerPort": 8080,
                    "protocol": "tcp"
                }
            ]
      }
    ],
    "requiresCompatibilities": [
        "EC2"
    ]
}
aws ecs register-task-definition --cli-input-json file://taskdef.json --region ap-southeast-2
```
