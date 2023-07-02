import React, { useState, useRef, useEffect, useMemo } from 'react';
import { vi } from 'vitest';
import { render as rtlRender, screen, renderHook, fireEvent } from '@testing-library/react';

import TextField from 'material-ui/TextField';

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import {
  simulateKeyInput,
  simulateFocusEvent,
  simulateBlurEvent,
  getCustomEvent,
  mount,
  shallow,
  getInputValue,
  render,
  wait,
} from '../test_util';
import NumericFormat, { useNumericFormat } from '../../src/numeric_format';
import PatternFormat, { usePatternFormat } from '../../src/pattern_format';
import NumberFormatBase from '../../src/number_format_base';

const onValueChangeFn =
  /*** format_number input as input ****/
  describe('NumberFormat as input', () => {
    beforeAll(() => {
      navigator['__defineGetter__']('platform', () => {
        return 'MacIntel';
      });
    });

    it('should render input as type text by default', async () => {
      const { input, user } = await render(<NumericFormat />);
      expect(input.getAttribute('type')).toBe('text');
    });

    it('should render input as defined type', async () => {
      const { input, user } = await render(<NumericFormat type="tel" />);
      expect(input.getAttribute('type')).toBe('tel');
    });

    it('should add inputMode numeric to non Iphone/IPad device by default to input element', async () => {
      const { input, user, rerender } = await render(<NumericFormat />);
      expect(input.getAttribute('inputmode')).toBe('numeric');

      //should allow updating the inputMode value
      rerender(<NumericFormat inputMode="search" />);
      expect(input.getAttribute('inputmode')).toBe('search');
    });

    // TODO
    it.skip('should add inputMode numeric only when app is mounted', async () => {
      const wrapper = shallow(<NumberFormatBase />, { disableLifecycleMethods: true });
      expect(wrapper.find('input').prop('inputMode')).toEqual(undefined);

      const wrapper2 = mount(<NumberFormatBase />);
      expect(wrapper2.find('input').prop('inputMode')).toEqual('numeric');
    });

    // TODO
    it.skip('should always add inputMode numeric to pattern format, even for Iphone/IPad device', async () => {
      navigator['__defineGetter__']('platform', async () => {
        return 'iPhone';
      });
      const { input, rerender } = await render(<PatternFormat />);
      expect(input.getAttribute('inputmode')).toBe('numeric');

      rerender(<PatternFormat format="##" />);
      expect(input.getAttribute('inputmode')).toBe('numeric');
    });

    it('should have initial value', async () => {
      const { input, user } = await render(
        <NumericFormat value={2456981} thousandSeparator={true} prefix={'$'} />,
      );
      expect(input).toHaveValue('$2,456,981');
    });

    it('should load the default value when initial value is null', async () => {
      const { input, user } = await render(<NumericFormat value={null} defaultValue={89} />);
      expect(input).toHaveValue('89');
    });

    // TODO: Testing internals like might not be possible with RTL
    // Consider removing this test entirely unless it serves a specific use case.
    // Also, the description does not seem to match the test.
    it.skip('should hold the previous valid value if the prop is changed to null', async () => {
      class WrapperComponent extends React.Component {
        constructor() {
          super();
          this.state = {
            testState: 90,
          };
        }
        render() {
          return <NumericFormat value={this.state.testState} />;
        }
      }

      const { input, user } = await render(<WrapperComponent />);

      expect(input).toHaveValue('90');
      wrapper.setState({ testState: null });
      expect(input).toHaveValue('90');
    });

    // If this has to be tested, this test should replace the one above.
    it('should hold the previous valid value if the prop is changed to null', async () => {
      const WrapperComponent = () => {
        const [testState, setTestState] = useState(90);

        return (
          <div>
            <NumericFormat value={testState} />
            <button
              onClick={(e) => {
                e.preventDefault();
                setTestState(null);
              }}
            >
              Click
            </button>
          </div>
        );
      };

      const { input, user, view } = await render(<WrapperComponent />);
      const button = view.getByText('Click');

      expect(input).toHaveValue('90');

      user.click(button);
      expect(input).toHaveValue('90');
    });

    it('should use defaultValue as initial value', async () => {
      const { input, user } = await render(
        <NumericFormat defaultValue={2456981} thousandSeparator={true} prefix={'$'} />,
      );
      expect(input).toHaveValue('$2,456,981');
    });

    it('should not reset value by default value once it is changed', async () => {
      const { input, user, rerender } = await render(
        <NumericFormat defaultValue={2456981} thousandSeparator={true} prefix={'$'} />,
      );
      await simulateKeyInput(user, input, '2', 9);
      expect(input).toHaveValue('$24,569,821');

      rerender(
        <NumericFormat
          defaultValue={2456981}
          thousandSeparator="."
          decimalSeparator=","
          prefix={'$'}
        />,
      );

      expect(input).toHaveValue('$24.569.821');
    });

    // TODO: Same as the test above where the state is being manipulated.
    it.skip('should not reset number inputs value if number input renders again with same props', async () => {
      class WrapperComponent extends React.Component {
        constructor() {
          super();
          this.state = {
            testState: false,
          };
        }
        render() {
          return <NumericFormat thousandSeparator={true} prefix={'$'} />;
        }
      }

      const { input, user } = await render(<WrapperComponent />);

      await simulateKeyInput(input, '2456981', 0);
      await simulateKeyInput(user, input, '2456981', 0);

      expect(input).toHaveValue('$2,456,981');

      wrapper.setState({ testState: true });

      expect(input).toHaveValue('$2,456,981');
    });

    // If this has to be tested, this test should replace the one above.
    it('should not reset number inputs value if number input renders again with same props', async () => {
      const WrapperComponent = () => {
        const [testState, setTestState] = useState(false);

        return (
          <div>
            <NumericFormat thousandSeparator={true} prefix={'$'} />
            <button
              onClick={(e) => {
                e.preventDefault();
                setTestState((c) => !c);
              }}
            >
              Click
            </button>
          </div>
        );
      };

      const { input, user, view } = await render(<WrapperComponent />);
      const button = view.getByText('Click');

      await simulateKeyInput(user, input, '2456981', 0);
      expect(input).toHaveValue('$2,456,981');

      user.click(button);
      expect(input).toHaveValue('$2,456,981');
    });

    it('removes negation when format props is provided', async () => {
      const { input, user } = await render(
        <PatternFormat format="#### #### #### ####" value="2342 2345 2342 2345" />,
      );

      //by default space is mask
      await simulateKeyInput(user, input, '-', 0);
      expect(input).toHaveValue('2342 2345 2342 2345');

      await simulateKeyInput(user, input, '-', 4);
      expect(input).toHaveValue('2342 2345 2342 2345');
    });

    it('should block inputs based on isAllowed callback', async () => {
      const { input, user } = await render(
        <NumericFormat
          isAllowed={(values) => {
            const { floatValue } = values;
            return floatValue <= 10000;
          }}
          value={9999}
        />,
      );

      expect(input).toHaveValue('9999');

      await simulateKeyInput(user, input, '9', 4);
      expect(input).toHaveValue('9999');
    });

    // TODO
    it.skip('handles multiple different allowed decimal separators', async () => {
      const allowedDecimalSeparators = [',', '.', 'm'];

      const { input, user, rerender } = await render(
        <NumericFormat
          decimalSeparator={','}
          allowedDecimalSeparators={allowedDecimalSeparators}
        />,
      );

      await simulateKeyInput(user, input, '12', 2);
      expect(input).toHaveValue('12');

      for (const separator of allowedDecimalSeparators) {
        rerender(
          <NumericFormat
            value={12}
            decimalSeparator={','}
            allowedDecimalSeparators={allowedDecimalSeparators}
          />,
        );

        // Why is this different from typing in '12'?
        expect(input).toHaveValue('12');

        await simulateKeyInput(user, input, separator, 2);
        expect(input).toHaveValue('12,');
      }
    });

    it('accepts dot as even when decimal separator is separate', async () => {
      const { input, user, rerender } = await render(<NumericFormat decimalSeparator={','} />);

      rerender(<NumericFormat decimalSeparator={','} value="12" />);

      await simulateKeyInput(user, input, '.', 2);
      expect(input).toHaveValue('12,');
    });

    // TODO
    it('numeric format works with custom input component', async () => {
      const NumericFormatWrapper = (props) => {
        return (
          <MuiThemeProvider>
            <NumericFormat {...props} />
          </MuiThemeProvider>
        );
      };

      const { input, user } = await render(
        <NumericFormatWrapper
          customInput={TextField}
          thousandSeparator={'.'}
          decimalSeparator={','}
        />,
      );

      await simulateKeyInput(user, input, '2456981,89', 0);
      expect(input).toHaveValue('2.456.981,89');
    });

    it('pattern format works with custom input component', async () => {
      const PatternFormatWrapper = (props) => {
        return (
          <MuiThemeProvider>
            <PatternFormat {...props} />
          </MuiThemeProvider>
        );
      };

      const { input, user } = await render(
        <PatternFormatWrapper
          format={'#### #### #### ####'}
          mask="_"
          thousandSeparator={'.'}
          decimalSeparator={','}
        />,
      );

      await simulateKeyInput(user, input, '411111', 0);
      expect(input).toHaveValue('4111 11__ ____ ____');
    });

    it('should update value if group of characters got deleted with format', async () => {
      const { input, user, rerender } = await render(
        <PatternFormat format="+1 (###) ### # ## US" value="+1 (999) 999 9 99 US" />,
      );

      await simulateKeyInput(user, input, '{Backspace}', 6, 10);
      expect(input).toHaveValue('+1 (999) 999 9    US');

      //when group of characters (including format character) is replaced with number
      rerender(<PatternFormat format="+1 (###) ### # ## US" value="+1 (888) 888 8 88 US" />);

      await simulateKeyInput(user, input, '8', 6, 10);
      expect(input).toHaveValue('+1 (888) 888 8 8  US');
    });

    it('should maintain the format even when the format is numeric and characters are deleted', async () => {
      const { input, user } = await render(
        <PatternFormat format="0###0 ###0####" value="01230 45607899" />,
      );

      await simulateKeyInput(user, input, '{Backspace}', 6, 10);
      expect(input).toHaveValue('01230 78909   ');
    });

    // TODO
    it.skip('should update value if whole content is replaced by new number', async () => {
      const { input, user } = await render(
        <PatternFormat format="+1 (###) ### # ## US" allowEmptyFormatting />,
      );

      wrapper.find('input').simulate('change', getCustomEvent('012345678', 20, 20));

      expect(wrapper.find('input').prop('value')).toEqual('+1 (012) 345 6 78 US');
    });

    // TODO: Replace the test above
    it('should update value if whole content is replaced', async () => {
      const { input, user } = await render(
        <PatternFormat format="+1 (###) ### # ## US" allowEmptyFormatting />,
      );

      await user.type(input, '012345678', { initialSelectionStart: 20, initialSelectionEnd: 20 });

      expect(input).toHaveValue('+1 (012) 345 6 78 US');
    });

    // TODO: Test value of the input instead of checking for prop value?
    it.skip('should replace the whole value if a new number is typed after selecting the everything', async () => {
      const { input, user } = await render(
        <NumericFormat prefix="$" value="10" allowedDecimalSeparators={[',', '.']} />,
      );

      await simulateKeyInput(user, input, '0', 0, 3);

      expect(wrapper.find('input').prop('value')).toEqual('$0');
    });

    // TODO: Replace the test above
    it('replace previous value and format new value when input content is selected and character is typed', async () => {
      const { input, user } = await render(
        <NumericFormat prefix="$" value="10" allowedDecimalSeparators={[',', '.']} />,
      );

      await simulateKeyInput(user, input, '0', 0, 3);
      expect(input).toHaveValue('$0');
    });

    it('should allow replacing all characters with number when formatting is present', async () => {
      const format = '+1 (###) ### # ## US';
      const { input, user } = await render(
        <PatternFormat format={format} value="+1 (123) 456 7 89 US" mask="_" />,
      );

      await simulateKeyInput(user, input, '8', 0, format.length);
      expect(input).toHaveValue('+1 (8__) ___ _ __ US');
    });

    // TODO: Consider testing internal logic like this using unit tests
    it('should give proper value when format character has number #652', async () => {
      //https://github.com/s-yadav/react-number-format/issues/652#issuecomment-1278200770
      const spy = vi.fn();

      const { input, user } = await render(
        <PatternFormat format="13###" mask="_" onValueChange={spy} />,
      );

      await simulateKeyInput(user, input, '3', 0);
      await simulateKeyInput(user, input, '4', 3);

      expect(spy).toHaveBeenCalledTimes(2);

      expect(spy.mock.lastCall[0]).toEqual({
        formattedValue: '1334_',
        value: '34',
        floatValue: 34,
      });
    });

    // TODO: Replace above test
    it('render correct value when format character contains a number', async () => {
      const { input, user } = await render(<PatternFormat format="13###" mask="_" />);

      await simulateKeyInput(user, input, '3', 0);
      expect(input).toHaveValue('133__');

      await simulateKeyInput(user, input, '4', 3);
      expect(input).toHaveValue('1334_');
    });

    it('should not allow replacing all characters with number when formatting is present for NumericFormats', async () => {
      //check for numeric input
      const value = '12.000';

      const { input, user, rerender } = await render(
        <NumericFormat value={value} decimalScale={3} fixedDecimalScale={true} />,
      );

      await simulateKeyInput(user, input, '9', 0, value.length);
      expect(input).toHaveValue('9.000');

      //bug #157
      rerender(<NumericFormat value={value} decimalScale={3} fixedDecimalScale={true} />);

      await simulateKeyInput(user, input, '1', 0, value.length);
      expect(input).toHaveValue('1.000');
    });

    it('should format value when input value is empty and allowEmptyFormatting is true', async () => {
      expect(async () => {
        const { input, user } = await render(<PatternFormat format="##/##/####" value="" />);

        expect(input).toHaveValue('  /  /    ');
      });
    });

    it('should format value when input value is not set and allowEmptyFormatting is true', async () => {
      expect(async () => {
        const { input, user } = await render(<PatternFormat format="##/##/####" />);

        expect(input).toHaveValue('  /  /    ');
      });
    });

    it('should not convert empty string to 0 if valueIsNumericString is true', async () => {
      const { input, user } = await render(
        <NumericFormat valueIsNumericString={true} value={''} decimalScale={2} />,
      );

      expect(input).toHaveValue('');
    });

    it('should not break if null or NaN is provided as value', async () => {
      const { input, user, rerender } = await render(
        <NumericFormat value={null} decimalScale={2} />,
      );
      expect(input).toHaveValue('');

      rerender(<NumericFormat value={NaN} decimalScale={2} />);
      expect(input).toHaveValue('');
    });

    it('should allow adding decimals and negation when float value is used to set state', async () => {
      function NumericFormatTest(props) {
        const [state, setState] = useState();

        useMemo(async () => {
          setState(props.value);
        }, [props.value]);

        return (
          <NumericFormat
            {...props}
            value={state}
            onValueChange={(values) => {
              setState(values.floatValue);
            }}
          />
        );
      }

      const { input, user, rerender } = await render(
        <NumericFormatTest
          onValueChange={(values) => {
            wrapper.setProps({ value: values.floatValue });
          }}
        />,
      );

      //check negation
      await simulateKeyInput(user, input, '-', 0);
      expect(input).toHaveValue('-');

      //check decimal
      await simulateKeyInput(user, input, '{Backspace}', 1);
      await simulateKeyInput(user, input, '.', 0);
      await simulateKeyInput(user, input, '2', 1);
      expect(input).toHaveValue('0.2');

      //check changing format should change the formatted value
      rerender(
        <NumericFormatTest
          onValueChange={(values) => {
            wrapper.setProps({ value: values.floatValue });
          }}
          prefix="$"
        />,
      );
      expect(input).toHaveValue('$0.2');

      //check if trailing decimal is supported
      rerender(
        <NumericFormatTest
          onValueChange={(values) => {
            wrapper.setProps({ value: values.floatValue });
          }}
          prefix="$"
          value={123}
        />,
      );
      await simulateKeyInput(user, input, '.', 4);
      expect(input).toHaveValue('$123.');

      //test in backspace leads correct formatting if it has trailing .
      await simulateKeyInput(user, input, '4', 5);
      expect(input).toHaveValue('$123.4');
      await simulateKeyInput(user, input, '{Backspace}', 6);
      expect(input).toHaveValue('$123');
    });

    // TODO: Could be replaced by the test below
    it.skip('should pass valid floatValue in isAllowed callback', async () => {
      const spy = vi.fn();

      const { input, user } = await render(<NumericFormat isAllowed={spy} />);

      await simulateKeyInput(user, input, '.', 0);
      expect(spy.mock.lastCall[0]).toEqual({
        formattedValue: '.',
        value: '.',
        floatValue: undefined,
      });

      await simulateKeyInput(user, input, '{Backspace}', 1);
      await simulateKeyInput(user, input, '0', 0);
      expect(spy.mock.lastCall[0]).toEqual({
        formattedValue: '0',
        value: '0',
        floatValue: 0,
      });

      await simulateKeyInput(user, input, '{Backspace}', 1);
      await simulateKeyInput(user, input, '123.', 0);
      expect(spy.mock.lastCall[0]).toEqual({
        formattedValue: '123.',
        value: '123.',
        floatValue: 123,
      });
    });

    // TODO: Replace above test
    it.skip('should test for behaviour', async () => {
      const { input, user } = await render(<NumericFormat isAllowed={() => true} />);

      await simulateKeyInput(user, input, '.', 0);
      expect(input).toHaveValue('.');

      await simulateKeyInput(user, input, '{Backspace}', 1);
      expect(input).toHaveValue('');
      await simulateKeyInput(user, input, '0', 0);
      expect(input).toHaveValue('0');

      await simulateKeyInput(user, input, '{Backspace}', 1);
      expect(input).toHaveValue('');
      await simulateKeyInput(user, input, '123.', 0);
      expect(input).toHaveValue('123.');
    });

    it('should not call onValueChange if no formatting is applied', async () => {
      const mockOnValueChange = vi.fn();

      const { input, user, rerender } = await render(
        <NumericFormat value="" onValueChange={mockOnValueChange} />,
      );

      expect(mockOnValueChange).not.toHaveBeenCalled();

      rerender(<NumericFormat value={NaN} onValueChange={mockOnValueChange} />);
      expect(mockOnValueChange).not.toHaveBeenCalled();

      rerender(<NumericFormat value={1234} onValueChange={mockOnValueChange} />);
      expect(mockOnValueChange).not.toHaveBeenCalled();

      rerender(<NumericFormat value={1234} onValueChange={mockOnValueChange} thousandSeparator />);
      expect(mockOnValueChange.mock.lastCall[0]).toEqual({
        formattedValue: '1,234',
        value: '1234',
        floatValue: 1234,
      });
    });

    // TODO: Clarify the purpose of this test
    it('should always call setState when input is not on focus and value formatting is changed from outside', async () => {
      const { input, user, rerender } = await render(
        <NumericFormat value="1.1" valueIsNumericString />,
      );

      // Why?
      simulateFocusEvent(input);
      await simulateKeyInput(user, input, '0', 3);

      expect(input).toHaveValue('1.10');

      simulateBlurEvent(input);

      rerender(<NumericFormat value="1.2" valueIsNumericString />);

      expect(input).toHaveValue('1.2');
    });

    it('should call onValueChange in change caused by prop change', async () => {
      const mockOnValueChange = vi.fn();
      const { rerender } = await render(
        <NumericFormat value="1234" valueIsNumericString onValueChange={mockOnValueChange} />,
      );

      rerender(
        <NumericFormat
          value="1234"
          valueIsNumericString
          thousandSeparator={true}
          onValueChange={mockOnValueChange}
        />,
      );

      expect(mockOnValueChange.mock.lastCall[0]).toEqual({
        formattedValue: '1,234',
        value: '1234',
        floatValue: 1234,
      });
    });

    // TODO: Consider updating to test behaviour, not implementation
    it.skip('should call onValueChange with the right source information', async () => {
      const spy = vi.fn();
      const { input, user, rerender } = await render(
        <NumericFormat value="1234" valueIsNumericString={true} onValueChange={spy} />,
      );

      // Test prop change onValueChange
      rerender(
        <NumericFormat
          onValueChange={spy}
          thousandSeparator
          value="1234"
          valueIsNumericString={true}
        />,
      );
      expect(spy.mock.lastCall[1]).toEqual({
        event: undefined,
        source: 'prop',
      });

      // Test with input change by simulateKeyInput
      await simulateKeyInput(user, input, '5', 0);
      const { event, source } = spy.mock.lastCall[1];
      const { key } = event;
      // Not sure if this has anything to do with the component?
      expect(key).toEqual('5');
      expect(source).toEqual('event');
    });

    // Replace the test above
    it('should call onValueChange when value changes', async () => {
      const mockOnValueChange = vi.fn();

      const { input, user, rerender } = await render(
        <NumericFormat
          value="1234"
          valueIsNumericString={true}
          onValueChange={mockOnValueChange}
        />,
      );

      expect(input).toHaveValue('1234');

      // Test prop change onValueChange
      rerender(
        <NumericFormat
          onValueChange={mockOnValueChange}
          thousandSeparator
          value="1234"
          valueIsNumericString={true}
        />,
      );
      expect(mockOnValueChange).toHaveBeenCalled();

      // Test with input change by simulateKeyInput
      await simulateKeyInput(user, input, '5', 0);
      expect(input).toHaveValue('51,234');
    });

    it('should treat Infinity value as empty string', async () => {
      const { input, user } = await render(<NumericFormat value={Infinity} />);

      expect(input).toHaveValue('');
    });

    it('should call onFocus prop when focused', async () => {
      const mockOnFocus = vi.fn();

      const { input, user } = await render(<NumericFormat onFocus={mockOnFocus} />);

      simulateFocusEvent(input);

      expect(mockOnFocus).toHaveBeenCalled();
    });

    it.skip('should not reset the selection when manually focused on mount', async () => {
      function Test() {
        const localInputRef = useRef();
        useEffect(async () => {
          // eslint-disable-next-line no-unused-expressions
          localInputRef.current?.select();
        }, []);

        return <NumericFormat getInputRef={(elm) => (localInputRef.current = elm)} value="12345" />;
      }

      const { input } = await render(<Test />);
      expect(input.selectionStart).toEqual(0);
      expect(input.selectionEnd).toEqual(5);
    });

    it('should not call onFocus prop when focused then blurred in the same event loop', async () => {
      const mockOnFocus = vi.fn();
      const { input, user } = await render(<NumericFormat onFocus={mockOnFocus} />);

      simulateFocusEvent(input);
      simulateBlurEvent(input);

      expect(mockOnFocus).not.toHaveBeenCalled();
    });

    it('should pass custom props to the renderText function', async () => {
      rtlRender(
        <NumericFormat
          displayType="text"
          value={1234}
          className="foo"
          renderText={(formattedValue, props) => (
            <span data-testid="input-renderText-span" {...props}>
              {formattedValue}
            </span>
          )}
        />,
      );

      const span = screen.getByTestId('input-renderText-span');

      expect(span.className).toBe('foo');
      expect(span.textContent).toBe('1234');
    });

    // TODO: Consider testing behaviour rather than implementation details
    it('should not fire onChange when change is not allowed via the isAllowed prop', async () => {
      const mockOnChange = vi.fn();
      const { input, user } = await render(
        <NumericFormat
          value={1234}
          className="foo"
          isAllowed={() => false}
          onChange={mockOnChange}
        />,
      );

      await simulateKeyInput(user, input, '5678', 2, 3);
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    // TODO: Consider testing behaviour rather than implementation details
    it('should call onChange if value is changed or reset #669 ', async () => {
      const mockOnChange = vi.fn();
      const { input, user } = await render(<NumericFormat value={1} onChange={mockOnChange} />);

      await simulateKeyInput(user, input, 'Backspace', 1);
      expect(mockOnChange).toHaveBeenCalled();
    });

    it.skip('should not give wrong value, when user enter more number than the given hash in PatternFormat #712', async () => {
      const Component = async () => {
        const [value, setValue] = useState('1232345124');
        return (
          <div>
            <PatternFormat
              value={value}
              format="(###) #### ###"
              valueIsNumericString
              mask="_"
              onValueChange={(values) => {
                setValue(values.value);
              }}
            />
            <span data-testid="value">{value}</span>
          </div>
        );
      };

      const { input, user, view } = await render(<Component />);
      await simulateKeyInput(user, input, '1', 1, 1);
      await wait(100);

      expect(input).toHaveValue('(112) 3234 512');
      const value = view.getByTestId('value');
      expect(value.innerText).toEqual('1123234512');
    });

    // Replace the test above
    it('should render correct value when user input does not match the expected pattern', async () => {
      const { input, user } = await render(
        <PatternFormat value={1232345124} format="(###) #### ###" valueIsNumericString mask="_" />,
      );

      expect(input).toHaveValue('(123) 2345 124');

      await simulateKeyInput(user, input, '1', 1, 1);
      expect(input).toHaveValue('(112) 3234 512');
    });

    it('should try to correct the value if old formatted value is provided but the format prop changes', async () => {
      const { input, rerender } = await render(
        <NumericFormat value="$1,234" prefix="$" thousandSeparator />,
      );
      expect(input).toHaveValue('$1,234');

      rerender(<NumericFormat value="$1,234" prefix="Rs. " thousandSeparator />);
      expect(input).toHaveValue('Rs. 1,234');
    });

    describe('Test masking', () => {
      it('should allow mask as string', async () => {
        const { input, user } = await render(<PatternFormat format="#### #### ####" mask="_" />);

        await simulateKeyInput(user, input, '111', 0);
        expect(input).toHaveValue('111_ ____ ____');

        await simulateKeyInput(user, input, '1', 3);
        expect(input).toHaveValue('1111 ____ ____');
      });

      it('should allow mask as array of strings', async () => {
        const { input, user } = await render(
          <PatternFormat format="##/##/####" mask={['D', 'D', 'M', 'M', 'Y', 'Y', 'Y', 'Y']} />,
        );

        await simulateKeyInput(user, input, '1', 0);
        expect(input).toHaveValue('1D/MM/YYYY');

        await simulateKeyInput(user, input, '3', 1);
        expect(input).toHaveValue('13/MM/YYYY');
      });

      it('should throw an error if mask has numeric character', async () => {
        expect(() => {
          rtlRender(<PatternFormat format="#### #### ####" mask="1" />);
        }).toThrow();

        expect(() => {
          rtlRender(
            <PatternFormat
              format="#### #### ####"
              mask={['D', 'D', 'M', '1', '2', 'Y', 'Y', 'Y']}
            />,
          );
        }).toThrow();
      });

      // TODO: Controlling state in a test
      // Test case for Issue #533
      it.skip('should show the right decimal values based on the decimal scale provided', async () => {
        class WrapperComponent extends React.Component {
          constructor() {
            super();
            this.state = {
              value: '123.123',
            };
          }

          onInputChange = (inputObj) => {
            this.setState({ value: inputObj.value });
          };

          render() {
            return (
              <NumericFormat
                name="numberformat"
                id="formatted-numberformat-input"
                value={this.state.value}
                onValueChange={this.onInputChange}
                decimalScale={18}
                thousandSeparator
                prefix={'$'}
                valueIsNumericString
              />
            );
          }
        }

        const { input, user } = await render(<WrapperComponent />);

        expect(input).toHaveValue('$123.123');
        wrapper.setState({ value: '123.1234' });
        expect(getInputValue(wrapper)).toEqual('$123.1234');
      });

      // Replaces the test above
      it('should correctly show the decimal values', async () => {
        const { input, user, rerender } = await render(
          <NumericFormat
            value="123.123"
            decimalScale={18}
            thousandSeparator
            prefix="$"
            valueIsNumericString
          />,
        );

        expect(input).toHaveValue('$123.123');

        rerender(
          <NumericFormat
            value="123.1234"
            decimalScale={18}
            thousandSeparator
            prefix="$"
            valueIsNumericString
          />,
        );
        expect(input).toHaveValue('$123.1234');
      });

      it.skip('should show the right number of zeros in all cases', async () => {
        class WrapperComponent extends React.Component {
          constructor() {
            super();
            this.state = {
              value: '100.0',
            };
          }

          render() {
            return (
              <NumericFormat
                name="numberformat"
                value={this.state.value}
                thousandSeparator
                prefix="$"
                decimalScale={2}
                valueIsNumericString
              />
            );
          }
        }

        const { input, user } = await render(<WrapperComponent />);
        expect(getInputValue(wrapper)).toEqual('$100.0');
        wrapper.setState({ value: '123.00' });
        expect(getInputValue(wrapper)).toEqual('$123.00');
        wrapper.setState({ value: '132.000' });
        expect(getInputValue(wrapper)).toEqual('$132.00');
        wrapper.setState({ value: '100.10' });
        expect(getInputValue(wrapper)).toEqual('$100.10');
      });
    });

    // Replaces the test above
    it('should show the correct number of zeroes after the decimal', async () => {
      const { input, user, rerender } = await render(
        <NumericFormat
          decimalScale={2}
          prefix="$"
          thousandSeparator
          value="100.0"
          valueIsNumericString
        />,
      );

      expect(input).toHaveValue('$100.0');

      rerender(
        <NumericFormat
          decimalScale={2}
          prefix="$"
          thousandSeparator
          value="123.00"
          valueIsNumericString
        />,
      );

      expect(input).toHaveValue('$123.00');

      rerender(
        <NumericFormat
          decimalScale={2}
          prefix="$"
          thousandSeparator
          value="132.000"
          valueIsNumericString
        />,
      );

      expect(input).toHaveValue('$132.00');

      rerender(
        <NumericFormat
          decimalScale={2}
          prefix="$"
          thousandSeparator
          value="100.10"
          valueIsNumericString
        />,
      );

      expect(input).toHaveValue('$100.10');
    });
  });

describe('Test hooks', () => {
  it('useNumericFormat hook should return all the expected props for NumberFormatBase', () => {
    const { result } = renderHook(() =>
      useNumericFormat({ thousandSeparator: '.', decimalSeparator: ',', maxLength: 5 }),
    );

    expect(result.current.maxLength).toBe(5);
    expect('thousandSeparator' in result.current).toBe(false);
  });

  it('usePatternFormat hook should return all the expected props for NumberFormatBase', async () => {
    const { result } = renderHook(() =>
      usePatternFormat({ format: '### ##', mask: '_', maxLength: 5 }),
    );

    expect(result.current.maxLength).toBe(5);
    expect('mask' in result.current).toBe(false);
  });
});
