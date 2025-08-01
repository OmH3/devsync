import React from 'react'
import { CallingState, StreamCall, StreamVideo, StreamVideoClient, useCall, useCallStateHooks, StreamTheme } from '@stream-io/video-react-sdk';
import '@stream-io/video-react-sdk/dist/css/styles.css';
import MyParticipantList from './MyParticipantList';
import MyFloatingLocalParticipant from './MyFloatingLocalParticipant';
const MyUILayout = () => {
  //   const {
  //   useCallCallingState,
  //   useLocalParticipant,
  //   useRemoteParticipants,
  // } = useCallStateHooks();

  // const callingState = useCallCallingState();
  // const localParticipant = useLocalParticipant();
  // const remoteParticipants = useRemoteParticipants();

  // if (callingState !== CallingState.JOINED) {
  //   return <div>Loading...</div>;
  // }

  // return (
  //   <StreamTheme>
  //     <MyParticipantList participants={remoteParticipants} />
  //     <MyFloatingLocalParticipant participant={localParticipant} />
  //   </StreamTheme>
  // );
}

export default MyUILayout