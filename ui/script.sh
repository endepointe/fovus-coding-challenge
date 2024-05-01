#!/bin/bash
id=$1
item=$(echo $(aws dynamodb get-item --table-name $"FileTable" --key "{\"id\": {\"S\": \"$id\" }}"))

# get the input_file_path from the item result
input_file_path=$(echo $item | jq -r '.Item.input_file_path.S')

bucket_name=$(echo $input_file_path | sed 's/\/.*//')
echo "Bucket name:" $bucket_name
echo "Input file path:" $input_file_path

echo "Downloading file from s3"
aws s3 cp s3://$input_file_path . 

echo "Downloaded file path: $input_file_path"
 
echo "Retrieving downloaded file and appending its content to a new file"
file_name=$(basename $input_file_path)
output_file_name=$(echo $file_name | sed 's/\./_output\./g')

cat $file_name >> $output_file_name

echo "New output file:" $output_file_name

echo "Uploading output file to s3"
aws s3 cp $output_file_name s3://$bucket_name/$output_file_name

echo "fin"
