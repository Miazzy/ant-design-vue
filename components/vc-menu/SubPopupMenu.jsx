import { Comment, inject } from 'vue';
import PropTypes from '../_util/vue-types';
import { connect } from '../_util/store';
import BaseMixin from '../_util/BaseMixin';
import KeyCode from '../_util/KeyCode';
import classNames from '../_util/classNames';
import { getKeyFromChildrenIndex, loopMenuItem, noop, isMobileDevice, menuAllProps } from './util';
import DOMWrap from './DOMWrap';
import {
  initDefaultProps,
  getOptionProps,
  getComponent,
  splitAttrs,
  getPropsData,
} from '../_util/props-util';
import FunctionProvider from './FunctionProvider';
function allDisabled(arr) {
  if (!arr.length) {
    return true;
  }
  return arr.every(c => {
    return !!c.disabled;
  });
}

function updateActiveKey(store, menuId, activeKey) {
  const state = store.getState();
  store.setState({
    activeKey: {
      ...state.activeKey,
      [menuId]: activeKey,
    },
  });
}

function getEventKey(props) {
  // when eventKey not available ,it's menu and return menu id '0-menu-'
  return props.eventKey || '0-menu-';
}

export function saveRef(key, c) {
  if (c) {
    const index = this.instanceArrayKeyIndexMap[key];
    this.instanceArray[index] = c;
  }
}
export function getActiveKey(props, originalActiveKey) {
  let activeKey = originalActiveKey;
  const { eventKey, defaultActiveFirst, children } = props;
  if (activeKey !== undefined && activeKey !== null) {
    let found;
    loopMenuItem(children, (c, i) => {
      const propsData = getPropsData(c);
      if (c && !propsData.disabled && activeKey === getKeyFromChildrenIndex(c, eventKey, i)) {
        found = true;
      }
    });
    if (found) {
      return activeKey;
    }
  }
  activeKey = null;
  if (defaultActiveFirst) {
    loopMenuItem(children, (c, i) => {
      const propsData = getPropsData(c);
      const noActiveKey = activeKey === null || activeKey === undefined;
      if (noActiveKey && c && !propsData.disabled) {
        activeKey = getKeyFromChildrenIndex(c, eventKey, i);
      }
    });
    return activeKey;
  }
  return activeKey;
}

const SubPopupMenu = {
  name: 'SubPopupMenu',
  inheritAttrs: false,
  props: initDefaultProps(
    {
      // onSelect: PropTypes.func,
      // onClick: PropTypes.func,
      // onDeselect: PropTypes.func,
      // onOpenChange: PropTypes.func,
      // onDestroy: PropTypes.func,
      prefixCls: PropTypes.string,
      openTransitionName: PropTypes.string,
      openAnimation: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
      openKeys: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
      visible: PropTypes.looseBool,
      eventKey: PropTypes.string,
      store: PropTypes.object,

      // adding in refactor
      focusable: PropTypes.looseBool,
      multiple: PropTypes.looseBool,
      defaultActiveFirst: PropTypes.looseBool,
      activeKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      selectedKeys: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
      defaultSelectedKeys: PropTypes.arrayOf(
        PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      ),
      defaultOpenKeys: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
      level: PropTypes.number,
      mode: PropTypes.oneOf([
        'horizontal',
        'vertical',
        'vertical-left',
        'vertical-right',
        'inline',
      ]),
      triggerSubMenuAction: PropTypes.oneOf(['click', 'hover']),
      inlineIndent: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      manualRef: PropTypes.func,
      itemIcon: PropTypes.any,
      expandIcon: PropTypes.any,
      overflowedIndicator: PropTypes.any,
      children: PropTypes.any.def([]),
    },
    {
      prefixCls: 'rc-menu',
      mode: 'vertical',
      level: 1,
      inlineIndent: 24,
      visible: true,
      focusable: true,
      manualRef: noop,
    },
  ),

  mixins: [BaseMixin],
  setup() {
    return { parentMenu: inject('parentMenu', undefined) };
  },
  created() {
    const props = getOptionProps(this);
    this.prevProps = { ...props };
    props.store.setState({
      activeKey: {
        ...props.store.getState().activeKey,
        [props.eventKey]: getActiveKey(props, props.activeKey),
      },
    });
    this.instanceArray = [];
  },
  mounted() {
    // invoke customized ref to expose component to mixin
    if (this.manualRef) {
      this.manualRef(this);
    }
  },
  updated() {
    const props = getOptionProps(this);
    const prevProps = this.prevProps;
    const originalActiveKey =
      'activeKey' in props ? props.activeKey : props.store.getState().activeKey[getEventKey(props)];
    const activeKey = getActiveKey(props, originalActiveKey);
    if (activeKey !== originalActiveKey) {
      updateActiveKey(props.store, getEventKey(props), activeKey);
    } else if ('activeKey' in prevProps) {
      // If prev activeKey is not same as current activeKey,
      // we should set it.
      const prevActiveKey = getActiveKey(prevProps, prevProps.activeKey);
      if (activeKey !== prevActiveKey) {
        updateActiveKey(props.store, getEventKey(props), activeKey);
      }
    }
    this.prevProps = { ...props };
  },
  methods: {
    // all keyboard events callbacks run from here at first
    onKeyDown(e, callback) {
      const keyCode = e.keyCode;
      let handled;
      this.getFlatInstanceArray().forEach(obj => {
        if (obj && obj.active && obj.onKeyDown) {
          handled = obj.onKeyDown(e);
        }
      });
      if (handled) {
        return 1;
      }
      let activeItem = null;
      if (keyCode === KeyCode.UP || keyCode === KeyCode.DOWN) {
        activeItem = this.step(keyCode === KeyCode.UP ? -1 : 1);
      }
      if (activeItem) {
        e.preventDefault();
        updateActiveKey(this.$props.store, getEventKey(this.$props), activeItem.eventKey);

        if (typeof callback === 'function') {
          callback(activeItem);
        }

        return 1;
      }
      return undefined;
    },

    onItemHover(e) {
      const { key, hover } = e;
      updateActiveKey(this.$props.store, getEventKey(this.$props), hover ? key : null);
    },

    onDeselect(selectInfo) {
      this.__emit('deselect', selectInfo);
    },

    onSelect(selectInfo) {
      this.__emit('select', selectInfo);
    },

    onClick(e) {
      this.__emit('click', e);
    },

    onOpenChange(e) {
      this.__emit('openChange', e);
    },

    onDestroy(key) {
      this.__emit('destroy', key);
    },

    getFlatInstanceArray() {
      return this.instanceArray;
    },

    getOpenTransitionName() {
      return this.$props.openTransitionName;
    },

    step(direction) {
      let children = this.getFlatInstanceArray();
      const activeKey = this.$props.store.getState().activeKey[getEventKey(this.$props)];
      const len = children.length;
      if (!len) {
        return null;
      }
      if (direction < 0) {
        children = children.concat().reverse();
      }
      // find current activeIndex
      let activeIndex = -1;
      children.every((c, ci) => {
        if (c && c.eventKey === activeKey) {
          activeIndex = ci;
          return false;
        }
        return true;
      });
      if (
        !this.defaultActiveFirst &&
        activeIndex !== -1 &&
        allDisabled(children.slice(activeIndex, len - 1))
      ) {
        return undefined;
      }
      const start = (activeIndex + 1) % len;
      let i = start;

      do {
        const child = children[i];
        if (!child || child.disabled) {
          i = (i + 1) % len;
        } else {
          return child;
        }
      } while (i !== start);

      return null;
    },
    getIcon(instance, name) {
      return getComponent(instance, name);
    },
    renderCommonMenuItem(child, i, extraProps) {
      if (child.type === Comment) {
        return child;
      }
      const state = this.$props.store.getState();
      const props = this.$props;
      const key = getKeyFromChildrenIndex(child, props.eventKey, i);
      const childProps = child.props || {}; // child.props 包含事件

      const isActive = key === state.activeKey[getEventKey(this.$props)];
      if (!childProps.disabled) {
        // manualRef的执行顺序不能保证，使用key映射ref在this.instanceArray中的位置
        this.instanceArrayKeyIndexMap[key] = Object.keys(this.instanceArrayKeyIndexMap).length;
      }
      const newChildProps = {
        mode: childProps.mode || props.mode,
        level: props.level,
        inlineIndent: props.inlineIndent,
        renderMenuItem: this.renderMenuItem,
        rootPrefixCls: props.prefixCls,
        index: i,
        // customized ref function, need to be invoked manually in child's componentDidMount
        manualRef: childProps.disabled ? noop : saveRef.bind(this, key),
        eventKey: key,
        active: !childProps.disabled && isActive,
        multiple: props.multiple,
        openTransitionName: this.getOpenTransitionName(),
        openAnimation: props.openAnimation,
        subMenuOpenDelay: props.subMenuOpenDelay,
        subMenuCloseDelay: props.subMenuCloseDelay,
        forceSubMenuRender: props.forceSubMenuRender,
        builtinPlacements: props.builtinPlacements,
        itemIcon: this.getIcon(child, 'itemIcon') || this.getIcon(this, 'itemIcon'),
        expandIcon: this.getIcon(child, 'expandIcon') || this.getIcon(this, 'expandIcon'),
        ...extraProps,
        onClick: e => {
          (childProps.onClick || noop)(e);
          this.onClick(e);
        },
        onItemHover: this.onItemHover,
        onOpenChange: this.onOpenChange,
        onDeselect: this.onDeselect,
        // destroy: this.onDestroy,
        onSelect: this.onSelect,
      };
      // ref: https://github.com/ant-design/ant-design/issues/13943
      if (props.mode === 'inline' || isMobileDevice()) {
        newChildProps.triggerSubMenuAction = 'click';
      }
      return <FunctionProvider {...newChildProps}>{child}</FunctionProvider>;
    },

    renderMenuItem(c, i, subMenuKey) {
      if (!c) {
        return null;
      }
      const state = this.$props.store.getState();
      const extraProps = {
        openKeys: state.openKeys,
        selectedKeys: state.selectedKeys,
        triggerSubMenuAction: this.triggerSubMenuAction,
        isRootMenu: false,
        subMenuKey,
      };
      return this.renderCommonMenuItem(c, i, extraProps);
    },
  },
  render() {
    const props = { ...this.$props };
    const { onEvents, extraAttrs } = splitAttrs(this.$attrs);
    const { eventKey, prefixCls, visible, level, mode, theme } = props;
    this.instanceArray = [];
    this.instanceArrayKeyIndexMap = {};
    const className = classNames(
      extraAttrs.class,
      props.prefixCls,
      `${props.prefixCls}-${props.mode}`,
    );
    menuAllProps.forEach(key => delete props[key]);
    // Otherwise, the propagated click event will trigger another onClick
    delete onEvents.onClick;
    const domWrapProps = {
      ...props,
      tag: 'ul',
      // hiddenClassName: `${prefixCls}-hidden`,
      visible,
      prefixCls,
      level,
      mode,
      theme,
      overflowedIndicator: getComponent(this, 'overflowedIndicator'),
      role: props.role || 'menu',
      class: className,
      style: extraAttrs.style,
      ...onEvents,
    };
    if (extraAttrs.id !== undefined) {
      domWrapProps.id = extraAttrs.id;
    }
    if (props.focusable) {
      domWrapProps.tabindex = '0';
      domWrapProps.onKeydown = this.onKeyDown;
    }
    delete domWrapProps.children;
    return (
      // ESLint is not smart enough to know that the type of `children` was checked.
      /* eslint-disable */
      <DOMWrap {...domWrapProps}>
        {props.children.map((c, i) => this.renderMenuItem(c, i, eventKey || '0-menu-'))}
      </DOMWrap>
      /*eslint -enable */
    );
  },
};

export default connect(undefined)(SubPopupMenu);
