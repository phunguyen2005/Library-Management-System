import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import AiChatbot from '../components/AiChatbot';

const MOJIBAKE_PATTERN = /(?:Ã|Ä|Æ|ðŸ|áº|á»|â€|â„|âœ|â|âš|â|â”|â–|â—|â†)/u;

describe('AiChatbot', () => {
  it('renders Vietnamese copy without mojibake', async () => {
    const user = userEvent.setup();
    Element.prototype.scrollIntoView = () => {};

    render(
      <MemoryRouter>
        <AiChatbot />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Trợ lý AI' }));

    const panelText = document.body.textContent ?? '';

    expect(panelText).toContain('Thủ thư AI HCMUE');
    expect(panelText).toContain('Xin chào! Tôi là');
    expect(panelText).toContain('Gợi ý câu hỏi nhanh');
    expect(panelText).toContain('Thời hạn mượn tối đa');
    expect(screen.getByPlaceholderText('Hỏi Thủ thư AI...')).toBeInTheDocument();
    expect(panelText).not.toMatch(MOJIBAKE_PATTERN);
  });
});
