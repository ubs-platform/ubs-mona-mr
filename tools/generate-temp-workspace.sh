echo "Creating temporary images: ubs_temp_workspace"
docker build --file Dockerfile-workspace --tag ubs_temp_workspace .
echo "Creating temporary images: ubs_temp_prod"
docker build --file Dockerfile-tempprod --tag ubs_temp_prod .
