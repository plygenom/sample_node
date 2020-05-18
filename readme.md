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
