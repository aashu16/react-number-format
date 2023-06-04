import React, { useState, useRef, useEffect, useMemo } from 'react';
import { renderHook } from '@testing-library/react-hooks/dom';

import TextField from 'material-ui/TextField';

import NumericFormat, { useNumericFormat } from '../../src/numeric_format';

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
  simulateNativeKeyInput,
} from '../test_util';
import PatternFormat, { usePatternFormat } from '../../src/pattern_format';
import NumberFormatBase from '../../src/number_format_base';

/*** format_number input as input ****/
describe('NumberFormat as input', () => {
  beforeAll(() => {
    navigator['__defineGetter__']('platform', () => {
      return 'MacIntel';
    });
  });

  it('should render input as type text by default', async () => {
    const { input, user } = await render(<NumericFormat />);
    expect(wrapper.find('input').instance().getAttribute('type')).toEqual('text');
  });

  it('should render input as defined type', async () => {
    const { input, user } = await render(<NumericFormat type="tel" />);
    expect(wrapper.find('input').instance().getAttribute('type')).toEqual('tel');
  });

  it('should add inputMode numeric to non Iphone/IPad device by default to input element', async () => {
    const { input, user } = await render(<NumericFormat />);
    expect(wrapper.find('input').instance().getAttribute('inputmode')).toEqual('numeric');

    //should allow updating the inputMode value
    wrapper.setProps({ inputMode: 'search' });
    expect(wrapper.find('input').instance().getAttribute('inputmode')).toEqual('search');
  });

  it('should add inputMode numeric only when app is mounted', async () => {
    const wrapper = shallow(<NumberFormatBase />, { disableLifecycleMethods: true });
    expect(wrapper.find('input').prop('inputMode')).toEqual(undefined);

    const wrapper2 = mount(<NumberFormatBase />);
    expect(wrapper2.find('input').prop('inputMode')).toEqual('numeric');
  });

  it('should always add inputMode numeric to pattern format, even for Iphone/IPad device', async () => {
    navigator['__defineGetter__']('platform', async () => {
      return 'iPhone';
    });
    const { input, user } = await render(<NumericFormat />);
    expect(wrapper.find('input').instance().getAttribute('inputmode')).toEqual(null);

    const wrapper2 = mount(<PatternFormat format="##" />);
    expect(wrapper2.find('input').instance().getAttribute('inputmode')).toEqual('numeric');
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
  // Consider removing this test entirely unless it serves specific use case.
  // Also, the description does not seem to match the test.
  it('should hold the previous valid value if the prop is changed to null', async () => {
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

  it('should use defaultValue as initial value', async () => {
    const { input, user } = await render(
      <NumericFormat defaultValue={2456981} thousandSeparator={true} prefix={'$'} />,
    );
    expect(input).toHaveValue('$2,456,981');
  });

  it('should not reset value by default value once it is changed', async () => {
    const { input, user } = await render(
      <NumericFormat defaultValue={2456981} thousandSeparator={true} prefix={'$'} />,
    );
    await simulateNativeKeyInput(user, input, '2', 9);
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

  // Same as the test above where the state is being manipulated.
  it('should not reset number inputs value if number input renders again with same props', async () => {
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

    simulateKeyInput(input, '2456981', 0);
    await simulateNativeKeyInput(user, input, '2456981', 0);

    expect(input).toHaveValue('$2,456,981');

    wrapper.setState({ testState: true });

    expect(input).toHaveValue('$2,456,981');
  });

  it('removes negation when format props is provided', async () => {
    const { input, user } = await render(
      <PatternFormat format="#### #### #### ####" value="2342 2345 2342 2345" />,
    );

    //by default space is mask
    await simulateNativeKeyInput(user, input, '-', 0);
    expect(input.instance().value).toEqual('2342 2345 2342 2345');
    expect(input).toHaveValue('2342 2345 2342 2345');

    simulateKeyInput(input, '-', 4);
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

    await simulateNativeKeyInput(user, input, '9', 4);

    expect(input).toHaveValue('9999');
  });

  // TODO
  it('handles multiple different allowed decimal separators', async () => {
    const allowedDecimalSeparators = [',', '.', 'm'];

    const { input, user } = await render(
      <NumericFormat decimalSeparator={','} allowedDecimalSeparators={allowedDecimalSeparators} />,
    );

    allowedDecimalSeparators.forEach((separator) => {
      wrapper.setProps({ value: '12' });
      simulateKeyInput(wrapper.find('input'), separator, 2);
      expect(getInputValue(wrapper)).toEqual('12,');
    });
  });

  it('accepts dot as even when decimal separator is separate', async () => {
    const { input, user, rerender } = await render(<NumericFormat decimalSeparator={','} />);
    rerender(<NumericFormat decimalSeparator={','} value="12" />);
    await simulateNativeKeyInput(user, input, '.', 2);
    expect(input).toHaveValue('12,');
  });

  // TODO
  it('works with custom input', async () => {
    const NumericFormatWrapper = (props) => {
      return (
        <MuiThemeProvider>
          <NumericFormat {...props} />
        </MuiThemeProvider>
      );
    };

    const PatternFormatWrapper = (props) => {
      return (
        <MuiThemeProvider>
          <PatternFormat {...props} />
        </MuiThemeProvider>
      );
    };

    const numericWrapper = mount(
      <NumericFormatWrapper
        customInput={TextField}
        thousandSeparator={'.'}
        decimalSeparator={','}
      />,
    );
    let input = numericWrapper.find('input');

    simulateKeyInput(input, '2456981,89', 0);
    expect(input.instance().value).toEqual('2.456.981,89');

    const patternWrapper = mount(
      <PatternFormatWrapper
        format={'#### #### #### ####'}
        mask="_"
        thousandSeparator={'.'}
        decimalSeparator={','}
      />,
    );

    input = patternWrapper.find('input');

    simulateKeyInput(input, '411111', 0);
    expect(input.instance().value).toEqual('4111 11__ ____ ____');
  });

  it('should update value if group of characters got deleted with format', async () => {
    const { input, user, rerender } = await render(
      <PatternFormat format="+1 (###) ### # ## US" value="+1 (999) 999 9 99 US" />,
    );
    await simulateNativeKeyInput(user, input, '{Backspace}', 6, 10);
    expect(getInputValue(wrapper)).toEqual('+1 (999) 999 9    US');
    expect(input).toHaveValue('+1 (999) 999 9    US');

    //when group of characters (including format character) is replaced with number
    rerender(<PatternFormat format="+1 (###) ### # ## US" value="+1 (888) 888 8 88 US" />);
    await simulateNativeKeyInput(user, input, '8', 6, 10);
    expect(input).toHaveValue('+1 (888) 888 8 8  US');
  });

  it('should maintain the format even when the format is numeric and characters are deleted', async () => {
    const { input, user } = await render(
      <PatternFormat format="0###0 ###0####" value="01230 45607899" />,
    );
    await simulateNativeKeyInput(user, input, '{Backspace}', 6, 10);
    expect(getInputValue(wrapper)).toEqual('01230 78909   ');
    expect(input).toHaveValue('01230 78909   ');
  });

  // TODO
  it('should update value if whole content is replaced by new number', async () => {
    const { input, user } = await render(
      <PatternFormat format="+1 (###) ### # ## US" allowEmptyFormatting />,
    );

    wrapper.find('input').simulate('change', getCustomEvent('012345678', 20, 20));

    expect(wrapper.find('input').prop('value')).toEqual('+1 (012) 345 6 78 US');
  });

  // TODO: Test value of the input instead of checking for prop value?
  it('should replace the whole value if a new number is typed after selecting the everything', async () => {
    const { input, user } = await render(
      <NumericFormat prefix="$" value="10" allowedDecimalSeparators={[',', '.']} />,
    );

    await simulateNativeKeyInput(user, input, '0', 0, 3);

    expect(wrapper.find('input').prop('value')).toEqual('$0');
  });

  it('should allow replacing all characters with number when formatting is present', async () => {
    const format = '+1 (###) ### # ## US';
    const { input, user } = await render(
      <PatternFormat format={format} value="+1 (123) 456 7 89 US" mask="_" />,
    );
    await simulateNativeKeyInput(user, input, '8', 0, format.length);
    expect(input).toHaveValue('+1 (8__) ___ _ __ US');
  });

  // TODO
  it('should give proper value when format character has number #652', async () => {
    //https://github.com/s-yadav/react-number-format/issues/652#issuecomment-1278200770
    const spy = jasmine.createSpy();
    const { input, user } = await render(
      <PatternFormat format="13###" mask="_" onValueChange={spy} />,
    );
    simulateKeyInput(wrapper.find('input'), '3', 0);
    simulateKeyInput(wrapper.find('input'), '4', 3);
    expect(spy.calls.argsFor(1)[0]).toEqual({
      formattedValue: '1334_',
      value: '34',
      floatValue: 34,
    });
  });

  it('should not allow replacing all characters with number when formatting is present for NumericFormats', async () => {
    //check for numeric input
    const value = '12.000';

    const { input, user, rerender } = await render(
      <NumericFormat value={value} decimalScale={3} fixedDecimalScale={true} />,
    );

    await simulateNativeKeyInput(user, input, '9', 0, value.length);
    expect(input).toHaveValue('9.000');

    //bug #157
    rerender(<NumericFormat value={value} decimalScale={3} fixedDecimalScale={true} />);
    await simulateNativeKeyInput(user, input, '1', 0, value.length);
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
      expoect(getInputValue(wrapper)).toEqual('  /  /    ');
    });
  });

  it('should not convert empty string to 0 if valueIsNumericString is true', async () => {
    const { input, user } = await render(
      <NumericFormat valueIsNumericString={true} value={''} decimalScale={2} />,
    );
    expect(getInputValue(wrapper)).toEqual('');
  });

  it('should not break if null or NaN is provided as value', async () => {
    const { input, user } = await render(<NumericFormat value={null} decimalScale={2} />);
    expect(getInputValue(wrapper)).toEqual('');

    wrapper.setProps({ value: NaN });
    expect(getInputValue(wrapper)).toEqual('');
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

    const { input, user } = await render(
      <NumericFormatTest
        onValueChange={(values) => {
          wrapper.setProps({ value: values.floatValue });
        }}
      />,
    );

    //check negation
    simulateKeyInput(wrapper.find('input'), '-', 0);
    expect(getInputValue(wrapper)).toEqual('-');

    //check decimal
    simulateKeyInput(wrapper.find('input'), 'Backspace', 1);
    simulateKeyInput(wrapper.find('input'), '.', 0);
    simulateKeyInput(wrapper.find('input'), '2', 1);
    expect(getInputValue(wrapper)).toEqual('0.2');

    //check changing format should change the formatted value
    wrapper.setProps({ prefix: '$' });
    expect(getInputValue(wrapper)).toEqual('$0.2');

    //check if trailing decimal is supported
    wrapper.setProps({ value: 123 });
    simulateKeyInput(wrapper.find('input'), '.', 4);
    expect(getInputValue(wrapper)).toEqual('$123.');

    //test in backspace leads correct formatting if it has trailing .
    simulateKeyInput(wrapper.find('input'), '4', 5);
    expect(getInputValue(wrapper)).toEqual('$123.4');
    simulateKeyInput(wrapper.find('input'), 'Backspace', 6);
    expect(getInputValue(wrapper)).toEqual('$123');
  });

  it('should pass valid floatValue in isAllowed callback', async () => {
    const spy = jasmine.createSpy();
    const { input, user } = await render(<NumericFormat isAllowed={spy} />);
    simulateKeyInput(wrapper.find('input'), '.', 0);
    expect(spy.calls.argsFor(0)[0]).toEqual({
      formattedValue: '.',
      value: '.',
      floatValue: undefined,
    });

    simulateKeyInput(wrapper.find('input'), 'Backspace', 1);
    simulateKeyInput(wrapper.find('input'), '0', 0);

    expect(spy.calls.argsFor(2)[0]).toEqual({
      formattedValue: '0',
      value: '0',
      floatValue: 0,
    });

    simulateKeyInput(wrapper.find('input'), 'Backspace', 1);
    simulateKeyInput(wrapper.find('input'), '123.', 0);
    expect(spy.calls.argsFor(4)[0]).toEqual({
      formattedValue: '123.',
      value: '123.',
      floatValue: 123,
    });
  });

  it('should not call onValueChange if no formatting is applied', async () => {
    const spy = jasmine.createSpy();
    const { input, user } = await render(<NumericFormat value="" onValueChange={spy} />);
    expect(spy).not.toHaveBeenCalled();

    wrapper.setProps({ value: NaN });
    expect(spy).not.toHaveBeenCalled();

    wrapper.setProps({ value: 1234 });
    expect(spy).not.toHaveBeenCalled();

    wrapper.setProps({ thousandSeparator: true });
    expect(spy.calls.argsFor(0)[0]).toEqual({
      formattedValue: '1,234',
      value: '1234',
      floatValue: 1234,
    });
  });

  it('should always call setState when input is not on focus and value formatting is changed from outside', async () => {
    const { input, user } = await render(<NumericFormat value="1.1" valueIsNumericString />);
    simulateFocusEvent(wrapper.find('input'));
    simulateKeyInput(wrapper.find('input'), '0', 3);

    expect(getInputValue(wrapper)).toEqual('1.10');

    simulateBlurEvent(wrapper.find('input'));

    wrapper.setProps({
      value: '1.2',
    });

    expect(getInputValue(wrapper)).toEqual('1.2');
  });

  it('should call onValueChange in change caused by prop change', async (done) => {
    const spy = jasmine.createSpy();
    const { rerender } = await render(
      <NumericFormat value="1234" valueIsNumericString onValueChange={spy} />,
    );
    rerender(
      <NumericFormat
        value="1234"
        valueIsNumericString
        thousandSeparator={true}
        onValueChange={spy}
      />,
    );

    await wait(100);

    expect(spy.calls.argsFor(0)[0]).toEqual({
      formattedValue: '1,234',
      value: '1234',
      floatValue: 1234,
    });

    done();
  });

  it('should call onValueChange with the right source information', async () => {
    const spy = jasmine.createSpy();
    const { input, user } = await render(
      <NumericFormat value="1234" valueIsNumericString={true} onValueChange={spy} />,
    );

    // Test prop change onValueChange
    wrapper.setProps({ thousandSeparator: true });
    expect(spy.calls.argsFor(0)[1]).toEqual({
      event: undefined,
      source: 'prop',
    });

    // Test with input change by simulateKeyInput
    simulateKeyInput(wrapper.find('input'), '5', 0);
    const { event, source } = spy.calls.argsFor(1)[1];
    const { key } = event;
    expect(key).toEqual('5');
    expect(source).toEqual('event');
  });

  it('should treat Infinity value as empty string', async () => {
    const { input, user } = await render(<NumericFormat value={Infinity} />);
    expect(getInputValue(wrapper)).toEqual('');
  });

  it('should call onFocus prop when focused', async (done) => {
    const spy = jasmine.createSpy('onFocus');
    const { input, user } = await render(<NumericFormat onFocus={spy} />);

    simulateFocusEvent(input);

    setTimeout(async () => {
      expect(spy).toHaveBeenCalled();
      done();
    }, 0);
  });

  it('should not reset the selection when manually focused on mount', async () => {
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

  it('should not call onFocus prop when focused then blurred in the same event loop', async (done) => {
    const spy = jasmine.createSpy('onFocus');
    const { input, user } = await render(<NumericFormat onFocus={spy} />);

    simulateFocusEvent(input);
    simulateBlurEvent(input);

    setTimeout(async () => {
      expect(spy).not.toHaveBeenCalled();
      done();
    }, 0);
  });

  it('should pass custom props to the renderText function', async () => {
    const { input, user } = await render(
      <NumericFormat
        displayType="text"
        value={1234}
        className="foo"
        renderText={(formattedValue, props) => <span {...props}>{formattedValue}</span>}
      />,
    );
    const span = wrapper.find('span');
    expect(span.props()).toEqual({ className: 'foo', children: '1234' });
  });

  it('should not fire onChange when change is not allowed via the isAllowed prop', async () => {
    const spy = jasmine.createSpy('onChange');
    const { input, user } = await render(
      <NumericFormat value={1234} className="foo" isAllowed={() => false} onChange={spy} />,
    );
    simulateKeyInput(wrapper.find('input'), '5678', 2, 3);
    expect(spy).not.toHaveBeenCalled();
  });

  it('should call onChange if value is changed or reset #669 ', async () => {
    const spy = jasmine.createSpy('onChange');
    const { input, user } = await render(<NumericFormat value={1} onChange={spy} />);
    simulateKeyInput(wrapper.find('input'), 'Backspace', 1);
    expect(spy).toHaveBeenCalled();
  });

  it('should not give wrong value, when user enter more number than the given hash in PatternFormat #712', async () => {
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

    const { input, view } = await render(<Component />);
    simulateNativeKeyInput(input, '1', 1, 1);
    await wait(100);

    expect(input.value).toEqual('(112) 3234 512');
    const value = view.getByTestId('value');
    expect(value.innerText).toEqual('1123234512');
  });

  it('should try to correct the value if old formatted value is provided but the format prop changes', async () => {
    const { input, rerender } = await render(
      <NumericFormat value="$1,234" prefix="$" thousandSeparator />,
    );
    expect(input.value).toEqual('$1,234');

    rerender(<NumericFormat value="$1,234" prefix="Rs. " thousandSeparator />);
    expect(input.value).toEqual('Rs. 1,234');
  });

  describe('Test masking', () => {
    it('should allow mask as string', async () => {
      const { input, user } = await render(<PatternFormat format="#### #### ####" mask="_" />);

      simulateKeyInput(wrapper.find('input'), '111', 0);
      expect(getInputValue(wrapper)).toEqual('111_ ____ ____');

      simulateKeyInput(wrapper.find('input'), '1', 3);
      expect(getInputValue(wrapper)).toEqual('1111 ____ ____');
    });

    it('should allow mask as array of strings', async () => {
      const { input, user } = await render(
        <PatternFormat format="##/##/####" mask={['D', 'D', 'M', 'M', 'Y', 'Y', 'Y', 'Y']} />,
      );

      simulateKeyInput(wrapper.find('input'), '1', 0);
      expect(getInputValue(wrapper)).toEqual('1D/MM/YYYY');

      simulateKeyInput(wrapper.find('input'), '3', 1);
      expect(getInputValue(wrapper)).toEqual('13/MM/YYYY');
    });

    it('should throw an error if mask has numeric character', async () => {
      expect(async () => {
        shallow(<PatternFormat format="#### #### ####" mask="1" />);
      }).toThrow();

      expect(async () => {
        shallow(
          <PatternFormat format="#### #### ####" mask={['D', 'D', 'M', '1', '2', 'Y', 'Y', 'Y']} />,
        );
      }).toThrow();
    });

    // Test case for Issue #533
    it('should show the right decimal values based on the decimal scale provided', async () => {
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
      expect(getInputValue(wrapper)).toEqual('$123.123');
      wrapper.setState({ value: '123.1234' });
      expect(getInputValue(wrapper)).toEqual('$123.1234');
    });

    it('should show the right number of zeros in all cases', async () => {
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
});

describe('Test hooks', () => {
  it('useNumericFormat hook should return all the expected props for NumberFormatBase', async () => {
    const { result } = renderHook(() =>
      useNumericFormat({ thousandSeparator: '.', decimalSeparator: ',', maxLength: 5 }),
    );

    expect('maxLength' in result.current).toEqual(true);
    expect('thousandSeparator' in result.current).toEqual(false);
  });

  it('usePatternFormat hook should return all the expected props for NumberFormatBase', async () => {
    const { result } = renderHook(() =>
      usePatternFormat({ format: '### ##', mask: '_', maxLength: 5 }),
    );

    expect('maxLength' in result.current).toEqual(true);
    expect('mask' in result.current).toEqual(false);
  });
});
