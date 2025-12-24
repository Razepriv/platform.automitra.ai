import { render, screen } from '@testing-library/react';
import AIAgents from '../pages/AIAgents';

describe('AIAgents Page', () => {
  it('renders the AI Agents heading', () => {
    render(<AIAgents />);
    expect(screen.getByText(/AI Agents/i)).toBeInTheDocument();
  });
});
