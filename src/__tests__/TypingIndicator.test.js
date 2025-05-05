import React from 'react';
import { render } from '@testing-library/react';
import TypingIndicator from '../components/TypingIndicator';

describe('TypingIndicator Component', () => {
  it('renders without crashing', () => {
    const { container } = render(<TypingIndicator />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders three animated dots', () => {
    const { container } = render(<TypingIndicator />);
    const dots = container.querySelectorAll('.w-2.h-2.bg-gray-500.rounded-full');
    expect(dots).toHaveLength(3);
  });

  it('has correct styling for container', () => {
    const { container } = render(<TypingIndicator />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass(
      'flex',
      'items-center',
      'space-x-1',
      'p-3',
      'max-w-[100px]',
      'bg-[var(--chat-assistant-bg)]',
      'text-[var(--chat-assistant-text)]',
      'rounded-lg',
      'self-start'
    );
  });

  it('has correct animation delays for dots', () => {
    const { container } = render(<TypingIndicator />);
    const dots = container.querySelectorAll('.w-2.h-2.bg-gray-500.rounded-full');
    
    // First dot has no delay
    expect(dots[0]).toHaveClass('animate-[bounce_1s_infinite]');
    
    // Second dot has 0.2s delay
    expect(dots[1]).toHaveClass('animate-[bounce_1s_infinite_0.2s]');
    
    // Third dot has 0.4s delay
    expect(dots[2]).toHaveClass('animate-[bounce_1s_infinite_0.4s]');
  });
}); 