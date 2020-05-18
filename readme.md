# Docker + Node 
Sample node application using docker.

## Setup

```powershell
git clone <<repo>>
cd << repo>>
docker --version
docker build -t sample_node:latest .
docker images --filter=reference='sample*
```

## To run locally 

```
PS C:\muthu\sample_node> docker run -d -p 80:8080 sample_node:latest
a4d9f6b860f00ca4aae3a5b531f2e921b53247905a88aa850e140ed6942fc5ce
PS C:\muthu\sample_node>

```
