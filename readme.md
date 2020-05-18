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

##  To Remove Image from ECR repo**

```powershell
$ImageId=(Get-ECRImage -RepositoryName $RepositoryName)
Remove-ECRImageBatch -RepositoryName $RepositoryName -ImageId $ImageId
```

##  To Remove ECR repo

```
Remove-ECRRepository -RepositoryName $RepositoryName
```

# Create ASG 

```
** 1. create launch config**
New-ASLaunchConfiguration -LaunchConfigurationName test-lc -InstanceType "t2.micro" -ImageId "ami-0970010f37c4f9c8d" -SecurityGroup "sg-082bb5832a24d0333" -IamInstanceProfile "ecsInstanceRole" -AssociatePublicIpAddress $true -EbsOptimized $true

**2.create Auto-scaling group**
New-ASAutoScalingGroup -AutoScalingGroupName test-asg -LaunchConfigurationName test-lc  -DesiredCapacity 1 -MinSize 1 -MaxSize 2 -AvailabilityZone @("ap-southeast-2a", "ap-southeast-2c")
```

# ECS cluster 
```
$ASG_ARN=(Get-ASAutoScalingGroup).AutoScalingGroupARN
New-ECSCapacityProvider -Name test-CapacityProvider -AutoScalingGroupProvider_AutoScalingGroupArn $ASG_ARN -ManagedScaling_MaximumScalingStepSize 1 -ManagedScaling_MinimumScalingStepSize 1 -ManagedScaling_Status ENABLED -ManagedScaling_TargetCapacity 100
```
