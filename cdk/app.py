# app.py
from aws_cdk import App
from next_memo.next_memo_stack import NextMemosStack

app = App()
NextMemosStack(app, "NextMemosStack")
app.synth()

# requirements.txt
aws-cdk-lib>=2.0.0
constructs>=10.0.0