import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { WelcomeScreen } from './WelcomeScreen';

test('waits for user action, then displays a successful connection', async () => {
  const connect = jest.fn().mockResolvedValue({ status: 'ready' });
  render(<WelcomeScreen connect={connect} />);
  expect(connect).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: '连接服务' }));
  expect(await screen.findByText('服务已连接。')).toBeTruthy();
  expect(connect).toHaveBeenCalledTimes(1);
});

test('connection failure gives a user-controlled retry', async () => {
  const connect = jest.fn().mockRejectedValueOnce(new Error('private detail')).mockResolvedValue({ status: 'ready' });
  render(<WelcomeScreen connect={connect} />);
  fireEvent.press(screen.getByRole('button', { name: '连接服务' }));
  expect(await screen.findByText('暂时无法连接，请稍后重试。')).toBeTruthy();
  expect(screen.queryByText('private detail')).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: '重新连接' }));
  expect(await screen.findByText('服务已连接。')).toBeTruthy();
  expect(connect).toHaveBeenCalledTimes(2);
});

test('prevents concurrent requests and aborts on unmount', async () => {
  let signal: AbortSignal | undefined;
  let finish: (() => void) | undefined;
  const connect = jest.fn((current?: AbortSignal) => { signal = current; return new Promise<{ status: 'ready' }>((resolve) => { finish = () => resolve({ status: 'ready' }); }); });
  const view = render(<WelcomeScreen connect={connect} />);
  fireEvent.press(screen.getByRole('button', { name: '连接服务' }));
  fireEvent.press(screen.getByRole('button', { name: '连接服务' }));
  expect(connect).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: '连接服务' })).toBeDisabled();
  view.unmount();
  expect(signal?.aborted).toBe(true);
  await act(async () => { finish?.(); });
});
