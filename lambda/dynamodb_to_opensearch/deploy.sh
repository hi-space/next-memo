python3 -m pip install -r requirements.txt -t ./packages/

LAMBDA_FUNC="NextMemoDataStack-DynamoToOpenSearchFunction9B05FD-Lk43b1d7r4O8"
zip -rq lambda.zip . -x *__pycache__* 2zip.sh env.sh requirements.txt CONFIG
aws lambda update-function-code --function-name $LAMBDA_FUNC --zip-file fileb://lambda.zip > /dev/null 2>&1
rm lambda.zip
