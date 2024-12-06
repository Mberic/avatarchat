# AvatarChat

This project uses Sobel edge detection to create a chat avatar from a live webcam stream. The detected edges are then published over the Streamr network. A user (user B) who would like to chat with this user (user A)  subscribes to this stream. 

**Note:** Both user A and user B are publishing their streams while also subscribing to each other's streams.

However, it's also possible to only subscribe to a stream without publishing.

## Usage

This section describes how to interact with the Dapp.

1. You and the person you would like to chat with should head over to avatarchat.space   
2. Enter the publisher and subscriber IDs. For this demo, 1 and 2 are the only possible values \- we are yet to implement a user authentication mechanism to remove the need for manually inserting the publisher ID.   
     
* Person A should enter 1 and 2   
* Person B, should enter the opposite: 2 and 1

## Use cases

Let's look at the intended use cases. 

* Video chat between 2 people   
* Live streaming e.g. web3 summit, hackathon events 