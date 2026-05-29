import { useEffect } from 'react';
import { echoClient } from '../lib/echo';

export const useWebSocket = (
  channelName: string,
  eventName: string,
  callback: (data: any) => void,
  isPrivate = false
) => {
  useEffect(() => {
    if (!channelName || !eventName) return;

    // Echo prefixing convention handles 'private-' automatically or we specify
    const channel = isPrivate
      ? echoClient.private(channelName)
      : echoClient.channel(channelName);

    // Listen with Pusher protocol convention (.EventName or EventName depending on broadcastAs)
    // To match broadcastAs(), listen to .borrow.request.created, etc.
    const listenerEvent = eventName.startsWith('.') ? eventName : `.${eventName}`;
    channel.listen(listenerEvent, callback);

    return () => {
      channel.stopListening(listenerEvent);
    };
  }, [channelName, eventName, callback, isPrivate]);
};
