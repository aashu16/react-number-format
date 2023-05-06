// @ts-check
import { expect } from 'vitest';
import matchers from '@testing-library/jest-dom/matchers';
import userEvent from '@testing-library/user-event';
import { render as testRender, fireEvent } from '@testing-library/react';

expect.extend(matchers);

export function getCustomEvent(value, selectionStart, selectionEnd) {
  return { target: { value } };
}

export function setCaretPosition(event, caretPos) {
  const { target } = event;
  target.focus();
  target.setSelectionRange(caretPos, caretPos);
}

export async function render(elm) {
  const view = testRender(elm);
  // /** @type {HTMLInputElement} */
  const input = view.getByRole('textbox');
  // const input = view.getByTestId('rnfinput');
  const user = userEvent.setup();
  return { ...view, view: view, input, user };
}

export async function simulateNativeKeyInput(user, input, key, selectionStart = 0, selectionEnd) {
  const v = input.value;

  let [start, end] = [selectionStart, selectionEnd ?? selectionStart];
  if (selectionStart > v.length) {
    start = v.length;
  }
  if (end > v.length) {
    end = v.length;
  }

  if (key.length === 0) {
    return;
  }

  const specialKeys = ['{Backspace}', '{Delete}'];

  if (specialKeys.includes(key)) {
    if (start === end) {
      await input.focus();
      await input.setSelectionRange(start, end);

      await user.keyboard(key);
    } else {
      let newValue;

      if (key === '{Backspace}') {
        // input.setRangeText('', start, end);
        newValue = v.slice(0, start) + v.slice(end, v.length);
      } else if (key === '{Delete}') {
        // input.setRangeText('', start, end, 'end');
        newValue = v.slice(0, start) + v.slice(end, v.length);
      }

      fireEvent.change(input, { target: { value: newValue } });
    }
  }

  if (key.length === 1 && !specialKeys.includes(key)) {
    if (start === end) {
      await input.focus();
      await input.setSelectionRange(start, end);

      await user.keyboard(key);
    } else {
      let newValue;

      newValue = v.slice(0, start) + key + v.slice(end, v.length);
      fireEvent.change(input, { target: { value: newValue } });
      end = start;
    }
  } else if (key.length > 1 && !specialKeys.includes(key)) {
    let newValue;
    newValue = v.slice(0, start) + v.slice(end, v.length);
    end = start;

    fireEvent.change(input, { target: { value: newValue } });

    await input.focus();
    await input.setSelectionRange(start, end);

    for (let i = 0; i < key.length; i++) {
      await user.keyboard(key[i]);
    }
  }
}

export function simulateMousUpEvent(user, input, selectionStart) {
  const selectionEnd = selectionStart;

  // await user.click(input);

  // input.selectionStart = selectionStart;

  fireEvent.mouseUp(input, {
    target: { selectionStart, selectionEnd },
  });
}

export function simulateFocusEvent(input, selectionStart = 0, selectionEnd, setSelectionRange) {
  if (selectionEnd === undefined) {
    selectionEnd = selectionStart;
  }

  input.focus();
}

export async function clearInput(user, input) {
  await user.clear(input);
}

export function simulateBlurEvent(input) {
  fireEvent.blur(input);
}
