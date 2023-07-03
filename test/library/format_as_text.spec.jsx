import React from 'react';
import { render as rtlRender, screen, renderHook, fireEvent } from '@testing-library/react';

import { mount, render } from '../test_util';
import NumericFormat from '../../src/numeric_format';
import PatternFormat from '../../src/pattern_format';

/*** format_number input as text ****/
describe('NumberFormat as text', () => {
  it('should format numbers to currency', () => {
    rtlRender(
      <NumericFormat value={2456981} displayType={'text'} thousandSeparator={true} prefix={'$'} />,
    );

    const span = screen.getByTestId('rnf-renderText-span');
    expect(span.textContent).toBe('$2,456,981');
  });

  it('should format as given format', () => {
    rtlRender(
      <PatternFormat value={4111111111111111} displayType={'text'} format="#### #### #### ####" />,
    );

    const span = screen.getByTestId('rnf-renderText-span');
    expect(span.textContent).toEqual('4111 1111 1111 1111');
  });

  it('should format as given format when input is string', () => {
    rtlRender(
      <PatternFormat
        value="4111111111111111"
        valueIsNumericString
        displayType={'text'}
        format="#### #### #### ####"
      />,
    );

    const span = screen.getByTestId('rnf-renderText-span');
    expect(span.textContent).toEqual('4111 1111 1111 1111');
  });

  it('should format as given format when input length is less than format length', () => {
    rtlRender(
      <PatternFormat
        value="41111111111111"
        valueIsNumericString
        displayType={'text'}
        format="#### #### #### ####"
      />,
    );

    const span = screen.getByTestId('rnf-renderText-span');
    expect(span.textContent).toEqual('4111 1111 1111 11  ');
  });

  it('should format as given format with mask', () => {
    rtlRender(
      <PatternFormat
        value="41111111111111"
        valueIsNumericString
        displayType={'text'}
        format="#### #### #### ####"
        mask="_"
      />,
    );

    const span = screen.getByTestId('rnf-renderText-span');
    expect(span.textContent).toEqual('4111 1111 1111 11__');
  });

  it('should limit decimal scale to given value', () => {
    const { rerender } = rtlRender(
      <NumericFormat value={4111.344} displayType={'text'} decimalScale={2} />,
    );

    const span = screen.getByTestId('rnf-renderText-span');
    expect(span.textContent).toEqual('4111.34');

    rerender(<NumericFormat value={4111.358} displayType={'text'} decimalScale={2} />);

    expect(span.textContent).toEqual('4111.36');
  });

  it('should add zeros if fixedDecimalScale is provided', () => {
    const { rerender } = rtlRender(
      <NumericFormat
        value="4111.11"
        valueIsNumericString
        displayType={'text'}
        decimalScale={4}
        fixedDecimalScale={true}
      />,
    );

    const span = screen.getByTestId('rnf-renderText-span');
    expect(span.textContent).toEqual('4111.1100');

    rerender(
      <NumericFormat
        value="4111.11"
        valueIsNumericString
        displayType={'text'}
        decimalScale={1}
        fixedDecimalScale={true}
      />,
    );
    expect(span.textContent).toEqual('4111.1');
  });

  it('should accept custom renderText method', () => {
    rtlRender(
      <NumericFormat
        value="4111.11"
        valueIsNumericString
        thousandSeparator=","
        renderText={(value) => <div data-testid="rnf-renderText-div">{value}</div>}
        displayType={'text'}
      />,
    );

    const div = screen.getByTestId('rnf-renderText-div');
    expect(div.textContent).toEqual('4,111.11');
  });
});
