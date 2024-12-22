mkdir python
python3 -m pip install opensearch-py requests requests-aws4auth -t python/
zip -r layer.zip python

aws lambda publish-layer-version \
    --layer-name python-opensearch-modules \
    --zip-file fileb://layer.zip \
    --compatible-runtimes python3.9
