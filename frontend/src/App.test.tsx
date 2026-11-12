import React from 'react';
import { render, screen, act } from '@testing-library/react';
import App from './App';

test('renders app loading screen', async () => {
  render(<App />);
  const loadingElement = screen.getByText(/Ładowanie aplikacji/i);
  expect(loadingElement).toBeInTheDocument();
  await act(async () => {
    await Promise.resolve();
  });
});

