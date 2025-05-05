import React from 'react';
import { render, screen, act } from '@testing-library/react';
import Toast from '../components/Toast';

describe('Toast Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders success toast with message', () => {
    render(
      <Toast
        type="success"
        message="Operation successful"
        duration={3000}
      />
    );

    expect(screen.getByText('Operation successful')).toBeInTheDocument();
    expect(screen.getByTestId('toast')).toHaveClass('bg-green-500');
  });

  it('renders error toast with message', () => {
    render(
      <Toast
        type="error"
        message="Operation failed"
        duration={3000}
      />
    );

    expect(screen.getByText('Operation failed')).toBeInTheDocument();
    expect(screen.getByTestId('toast')).toHaveClass('bg-red-500');
  });

  it('renders warning toast with message', () => {
    render(
      <Toast
        type="warning"
        message="Please be careful"
        duration={3000}
      />
    );

    expect(screen.getByText('Please be careful')).toBeInTheDocument();
    expect(screen.getByTestId('toast')).toHaveClass('bg-yellow-500');
  });

  it('calls onClose after duration', () => {
    const onClose = jest.fn();
    render(
      <Toast
        type="success"
        message="Test message"
        duration={3000}
        onClose={onClose}
      />
    );

    expect(onClose).not.toHaveBeenCalled();

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose if duration is 0', () => {
    const onClose = jest.fn();
    render(
      <Toast
        type="success"
        message="Test message"
        duration={0}
        onClose={onClose}
      />
    );

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(onClose).not.toHaveBeenCalled();
  });
}); 