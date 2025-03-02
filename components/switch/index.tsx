import { defineComponent, inject } from 'vue';
import LoadingOutlined from '@ant-design/icons-vue/LoadingOutlined';
import PropTypes from '../_util/vue-types';
import hasProp, { getOptionProps, getComponent } from '../_util/props-util';
import VcSwitch from '../vc-switch';
import Wave from '../_util/wave';
import { defaultConfigProvider } from '../config-provider';
import warning from '../_util/warning';
import { tuple, withInstall } from '../_util/type';

const Switch = defineComponent({
  name: 'ASwitch',
  __ANT_SWITCH: true,
  inheritAttrs: false,
  props: {
    prefixCls: PropTypes.string,
    // size=default and size=large are the same
    size: PropTypes.oneOf(tuple('small', 'default', 'large')),
    disabled: PropTypes.looseBool,
    checkedChildren: PropTypes.any,
    unCheckedChildren: PropTypes.any,
    tabindex: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    checked: PropTypes.looseBool,
    defaultChecked: PropTypes.looseBool,
    autofocus: PropTypes.looseBool,
    loading: PropTypes.looseBool,
  },
  setup() {
    return {
      refSwitchNode: undefined,
      configProvider: inject('configProvider', defaultConfigProvider),
    };
  },
  methods: {
    focus() {
      this.refSwitchNode?.focus();
    },
    blur() {
      this.refSwitchNode?.blur();
    },
    saveRef(c) {
      this.refSwitchNode = c;
    },
  },
  created() {
    warning(
      hasProp(this, 'checked') || !('value' in this.$attrs),
      'Switch',
      '`value` is not validate prop, do you mean `checked`?',
    );
  },

  render() {
    const { prefixCls: customizePrefixCls, size, loading, disabled, ...restProps } = getOptionProps(
      this,
    );
    const { getPrefixCls } = this.configProvider;
    const prefixCls = getPrefixCls('switch', customizePrefixCls);
    const { $attrs } = this;

    const classes = {
      [$attrs.class as string]: $attrs.class,
      [`${prefixCls}-small`]: size === 'small',
      [`${prefixCls}-loading`]: loading,
    };
    const loadingIcon = loading ? <LoadingOutlined class={`${prefixCls}-loading-icon`} /> : null;
    const switchProps = {
      ...restProps,
      ...$attrs,
      prefixCls,
      loadingIcon,
      checkedChildren: getComponent(this, 'checkedChildren'),
      unCheckedChildren: getComponent(this, 'unCheckedChildren'),
      disabled: disabled || loading,
      class: classes,
      ref: this.saveRef,
    };
    return (
      <Wave insertExtraNode>
        <VcSwitch {...switchProps} />
      </Wave>
    );
  },
});

export default withInstall(Switch);
