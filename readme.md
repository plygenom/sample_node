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

#powershell history

```powershell
 287 aws iam list-instance-profiles-for-role --role-name ecsInstanceRole
 288 notepad CLItutorial-launchconfig.json
 289 notepad userdata.txt
 290 aws autoscaling create-launch-configuration --cli-input-json file://CLItutorial-launchconfig.json --user-data file://userdata.txt --regi...
 291 notepad CLItutorial-launchconfig.json
 292 aws autoscaling create-launch-configuration --cli-input-json file://CLItutorial-launchconfig.json --user-data file://userdata.txt --regi...
 293 notepad CLItutorial-launchconfig.json
 294 notepad CLItutorial-launchconfig.json
 295 aws autoscaling create-launch-configuration --cli-input-json file://CLItutorial-launchconfig.json --user-data file://userdata.txt --regi...
 296 aws autoscaling describe-launch-configurations --launch-configuration-names CLItutorial-launchconfig --region ap-southeast-2
 297 aws iam list-instance-profiles-for-role --role-name AWSServiceRoleForAutoScaling
 298 aws iam --help
 299 notepad CLItutorial-asgconfig.json
 300 aws autoscaling create-auto-scaling-group --auto-scaling-group-name CLItutorial-asg --cli-input-json file://CLItutorial-asgconfig.json -...
 301 notepad CLItutorial-asgconfig.json
 302 aws autoscaling create-auto-scaling-group --auto-scaling-group-name CLItutorial-asg --cli-input-json file://CLItutorial-asgconfig.json -...
 303 aws autoscaling create-auto-scaling-group --auto-scaling-group-name CLItutorial-asg-burst --cli-input-json file://CLItutorial-asgconfig....
 304 aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names CLItutorial-asg CLItutorial-asg-burst --region ap-southeast-2
 305 notepad CLItutorial-capacityprovider.json
 306 (Get-ASAutoScalingGroup -AutoScalingGroupName CLItutorial-asg).AutoScalingGroupARN
 307 (Get-ASAutoScalingGroup -AutoScalingGroupName CLItutorial-asg-burst).AutoScalingGroupARN
 308 aws ecs create-capacity-provider --cli-input-json file://CLItutorial-capacityprovider.json --region ap-southeast-2
 309 notepad CLItutorial-capacityprovider-burst.json
 310 aws ecs create-capacity-provider --cli-input-json file://CLItutorial-capacityprovider-burst.json --region ap-southeast-2
 311 aws ecs create-cluster --cluster-name CLItutorial-cluster --capacity-providers CLItutorial-capacityprovider CLItutorial-        capacityprovider-burst --default-capacity-provider-strategy capacityProvider=CLItutorial-capacityprovider,weight=1 capacityProvider=CLItutorial-capacityprovider-burst,weight=1 --region ap-southeast-2

 312 aws ecs describe-clusters --clusters CLItutorial-cluster --include ATTACHMENTS --region ap-southeast-2
 313 history
 314 Get-Alias grep
 315 Get-Alias ls
 316 Get-Alias grep
 317 history | Select-String "register"
 318 aws ecs register-task-definition --cli-input-json file://taskdef.json --region ap-southeast-2
 319 aws ecs run-task --cluster CLItutorial-cluster --count 2 --task-definition node-taskdef:1 --region ap-southeast-2
 320 aws ecs run-task --cluster CLItutorial-cluster --count 2 --task-definition node-taskdef:3 --region ap-southeast-2
 321 aws ecs describe-clusters --clusters CLItutorial-cluster --include ATTACHMENTS --region ap-southeast-2
 322 aws ecs list-tasks --cluster CLItutorial-cluster --region ap-southeast-2
 323 aws ecs stop-task --cluster CLItutorial-cluster --task 77001979-c138-489b-bc1e-596c73b28b81 --region ap-southeast-2
 324 aws ecs stop-task --cluster CLItutorial-cluster --task a6990fb2-9534-4454-b204-3219e23d0f64 --region ap-southeast-2
 325 aws ecs run-task --cluster CLItutorial-cluster --count 2 --task-definition node-taskdef:3 --region ap-southeast-2
 326 aws ecs describe-clusters --clusters CLItutorial-cluster --include ATTACHMENTS --region ap-southeast-2
 327 aws autoscaling delete-auto-scaling-group --auto-scaling-group-name CLItutorial-asg --force-delete --region ap-southeast-2
 328 aws autoscaling delete-auto-scaling-group --auto-scaling-group-name CLItutorial-asg-burst --force-delete --region ap-southeast-2
 329 aws ecs delete-cluster --cluster CLItutorial-cluster --region ap-southeast-2
 330 aws ecs delete-cluster --cluster CLItutorial-cluster --region ap-southeast-2
 331 clear-host


PS C:\muthu>

```
