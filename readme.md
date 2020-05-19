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
** 1. create launch config**
--- create userdata.txt file with ---
#!/bin/bash
echo ECS_CLUSTER=test-cluster >> /etc/ecs/ecs.config;echo ECS_BACKEND_HOST= >> /etc/ecs/ecs.config;
--------
$userdata=Get-Content ".\userdata.txt";$Bytes=[System.Text.Encoding]::UTF8.GetBytes($userdata);$Encoded_userdata = [System.Convert]::ToBase64String($Bytes)
New-ASLaunchConfiguration -LaunchConfigurationName node-lc -InstanceType "t2.micro" -ImageId "ami-0970010f37c4f9c8d" -SecurityGroup "sg-082bb5832a24d0333" -KeyName "MyKeyPair" -IamInstanceProfile "ecsInstanceRole" -AssociatePublicIpAddress $true -UserData $Encoded_userdata

aws autoscaling describe-launch-configurations --launch-configuration-names node-lc --region ap-southeast-2

**2.create Auto-scaling group**
New-ASAutoScalingGroup -AutoScalingGroupName node-asg -LaunchConfigurationName node-lc  -DesiredCapacity 1 -MinSize 1 -MaxSize 2 -AvailabilityZone @("ap-southeast-2a", "ap-southeast-2c") -VPCZoneIdentifier 'subnet-0d0a667209c85e337,subnet-070a2407837b46f8d'

aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names node-asg --region ap-southeast-2
```

## ECS resource and Cluster creation
```powershell
$ASG_ARN=(Get-ASAutoScalingGroup -AutoScalingGroupName node-asg).AutoScalingGroupARN

New-ECSCapacityProvider -Name node-cp -AutoScalingGroupProvider_AutoScalingGroupArn $ASG_ARN -ManagedScaling_MaximumScalingStepSize 1 -ManagedScaling_MinimumScalingStepSize 1 -ManagedScaling_Status ENABLED -ManagedScaling_TargetCapacity 100

New-ECSCluster -ClusterName node-cluster -CapacityProvider node-cp -DefaultCapacityProviderStrategy @{capacityProvider="node-cp";weight=1;base=1}

aws ecs describe-clusters --clusters node-cluster --include ATTACHMENTS --region ap-southeast-2
aws ecs put-cluster-capacity-providers --cluster node-cluster --capacity-providers node-cp --default-capacity-provider-strategy capacityProvider=node-cp,weight=1,base=1

```
