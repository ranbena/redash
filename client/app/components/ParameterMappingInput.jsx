/* eslint react/no-multi-comp: 0 */

import { extend, map, includes, findIndex, find, fromPairs, isEmpty, clone } from 'lodash';
import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import Table from 'antd/lib/table';
import Button from 'antd/lib/button';
import Select from 'antd/lib/select';
import Icon from 'antd/lib/icon';
import Popover from 'antd/lib/popover';
import Input from 'antd/lib/input';
import Radio from 'antd/lib/radio';
import Tooltip from 'antd/lib/tooltip';
import Collapse from 'antd/lib/collapse';
import { ParameterValueInput } from '@/components/ParameterValueInput';
import { ParameterMappingType } from '@/services/widget';

export const MappingType = {
  DashboardAddNew: 'dashboard-add-new',
  DashboardMapToExisting: 'dashboard-map-to-existing',
  WidgetLevel: 'widget-level',
  StaticValue: 'static-value',
};

const MappingTypeLabel = {
  [MappingType.DashboardAddNew]: 'New dashboard parameter',
  [MappingType.DashboardMapToExisting]: 'Existing dashboard parameter',
  [MappingType.WidgetLevel]: 'Widget parameter',
  [MappingType.StaticValue]: 'Static value',
};

export function parameterMappingsToEditableMappings(mappings, parameters, existingParameterNames = []) {
  return map(mappings, (mapping) => {
    const result = extend({}, mapping);
    const alreadyExists = includes(existingParameterNames, mapping.mapTo);
    result.param = find(parameters, p => p.name === mapping.name);
    switch (mapping.type) {
      case ParameterMappingType.DashboardLevel:
        result.type = alreadyExists ? MappingType.DashboardMapToExisting : MappingType.DashboardAddNew;
        result.value = null;
        break;
      case ParameterMappingType.StaticValue:
        result.type = MappingType.StaticValue;
        result.param = result.param.clone();
        result.param.setValue(result.value);
        break;
      case ParameterMappingType.WidgetLevel:
        result.type = MappingType.WidgetLevel;
        result.value = null;
        break;
      // no default
    }
    return result;
  });
}

export function editableMappingsToParameterMappings(mappings) {
  return fromPairs(map( // convert to map
    mappings,
    (mapping) => {
      const result = extend({}, mapping);
      switch (mapping.type) {
        case MappingType.DashboardAddNew:
          result.type = ParameterMappingType.DashboardLevel;
          result.value = null;
          break;
        case MappingType.DashboardMapToExisting:
          result.type = ParameterMappingType.DashboardLevel;
          result.value = null;
          break;
        case MappingType.StaticValue:
          result.type = ParameterMappingType.StaticValue;
          result.param = mapping.param.clone();
          result.param.setValue(result.value);
          result.value = result.param.value;
          break;
        case MappingType.WidgetLevel:
          result.type = ParameterMappingType.WidgetLevel;
          result.value = null;
          break;
        // no default
      }
      delete result.param;
      return [result.name, result];
    },
  ));
}

function RadioPanel({ header, isActive, ...props }) {
  const radio = (
    <Radio checked={isActive}>{header}</Radio>
  );

  return (
    <Collapse.Panel
      style={{ border: 0, marginBottom: -10 }}
      showArrow={false}
      header={radio}
      isActive={isActive}
      {...props}
    />
  );
}

class SourceInput extends React.Component {
  static propTypes = {
    mapping: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    existingParamNames: PropTypes.arrayOf(PropTypes.string).isRequired,
    onChange: PropTypes.func.isRequired,
    getContainerElement: PropTypes.func.isRequired,
    clientConfig: PropTypes.any.isRequired, // eslint-disable-line react/forbid-prop-types
    Query: PropTypes.any.isRequired, // eslint-disable-line react/forbid-prop-types
  };

  constructor(props) {
    super(props);
    this.state = {
      editMode: false,
      originalMapTo: null,
      mapping: clone(this.props.mapping),
    };
  }

  onVisibleChange = (visible) => {
    if (!visible) {
      this.cancel();
    } else {
      this.setState({ editMode: true });

      // update states that might have changed (e.g. mapping.title)
      this.mapping = clone(this.props.mapping);
      this.setState({ originalMapTo: this.props.mapping.mapTo });
    }
  }

  onChangeAddNewName = (e) => {
    this.mapping = { mapTo: e.target.value };
  }

  onChangeSourceType = (type) => {
    let mapTo = this.state.originalMapTo;
    if (type === MappingType.DashboardMapToExisting) {
      const { existingParamNames } = this.props;
      if (!includes(existingParamNames, mapTo)) {
        mapTo = existingParamNames[0]; // select first, undefined also ok
      }
    }

    this.mapping = { type, mapTo };
  }

  onChangeMapToParam = (mapTo) => {
    this.mapping = { mapTo };
  }

  onChangeStaticValue = (value) => {
    this.mapping = { value };
  }

  get popover() {
    const { existingParamNames: existing } = this.props;
    const {
      type, mapTo, value, param,
    } = this.state.mapping;

    const alreadyExists = includes(existing, mapTo);
    const noExisting = isEmpty(existing);

    let fulfilled = true;
    if (
      type === MappingType.DashboardMapToExisting && noExisting ||
      type === MappingType.DashboardAddNew && (alreadyExists || isEmpty(mapTo))
    ) {
      fulfilled = false;
    }

    return (
      <div style={{ width: 300, height: 233, position: 'relative' }}>
        <Collapse bordered={false} accordion onChange={this.onChangeSourceType} defaultActiveKey={type}>
          <RadioPanel
            header={MappingTypeLabel[MappingType.DashboardAddNew]}
            key={MappingType.DashboardAddNew}
          >
            <Input
              size="small"
              value={mapTo}
              onChange={this.onChangeAddNewName}
            />
          </RadioPanel>
          <RadioPanel
            header={MappingTypeLabel[MappingType.DashboardMapToExisting]}
            key={MappingType.DashboardMapToExisting}
          >
            {noExisting ?
              <Tooltip title="There are currently no dashboard parameters">
                <Icon
                  type="exclamation-circle"
                  style={{
                    verticalAlign: 'text-bottom',
                    position: 'relative',
                    top: -1,
                    color: type === MappingType.DashboardMapToExisting ? '#F44336' : '#d6d6d6',
                  }}
                />
              </Tooltip> :
              <Select
                class="w-100"
                value={mapTo}
                onChange={this.onChangeMapToParam}
                size="small"
                dropdownMatchSelectWidth={false}
              >
                {existing.map(prm => (
                  <Select.Option value={prm} key={prm}>{prm}</Select.Option>
                ))}
              </Select>
            }
          </RadioPanel>
          <RadioPanel
            header={MappingTypeLabel[MappingType.WidgetLevel]}
            key={MappingType.WidgetLevel}
          />
          <RadioPanel
            header={MappingTypeLabel[MappingType.StaticValue]}
            key={MappingType.StaticValue}
          >
            <ParameterValueInput
              className="static-value-input"
              size="small"
              type={param.type}
              value={value || param.normalizedValue}
              enumOptions={param.enumOptions}
              queryId={param.queryId}
              onSelect={this.onChangeStaticValue}
              clientConfig={this.props.clientConfig}
              Query={this.props.Query}
            />
          </RadioPanel>
        </Collapse>
        <footer style={{
         marginTop: 10, paddingTop: 10, borderTop: '1px solid #eee', textAlign: 'right', position: 'absolute', left: 0, right: 0, bottom: 0,
        }}
        >
          <Button size="small" onClick={this.cancel} style={{ marginRight: 2 }}>
            Cancel
          </Button>
          <Button size="small" type="primary" onClick={this.save} disabled={!fulfilled}>OK</Button>
        </footer>
      </div>
    );
  }

  set mapping(props) {
    this.setState({
      mapping: extend(this.state.mapping, props),
    });
  }

  save = () => {
    this.props.onChange(this.state.mapping);
    this.hide();
  }

  cancel = () => {
    this.mapping = clone(this.props.mapping); // restore original state
    this.hide();
  }

  hide = () => {
    this.setState({ editMode: false });
  }

  render() {
    const { mapping, getContainerElement } = this.props;
    return (
      <span style={{ whiteSpace: 'nowrap' }}>
        {MappingTypeLabel[mapping.type]}
        {' '}
        {includes([MappingType.DashboardAddNew, MappingType.DashboardMapToExisting], mapping.type)
          ? <code className="ant-tag" style={{ margin: 0 }}>{mapping.mapTo}</code>
          : null
        }
        {' '}
        <Popover
          placement="left"
          trigger="click"
          content={this.popover}
          visible={this.state.editMode}
          onVisibleChange={this.onVisibleChange}
          getPopupContainer={getContainerElement}
        >
          <Button size="small" type="dashed">
            <Icon type="edit" />
          </Button>
        </Popover>
      </span>
    );
  }
}

class TitleInput extends React.Component {
  static propTypes = {
    mapping: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    onChange: PropTypes.func.isRequired,
    getContainerElement: PropTypes.func.isRequired,
  };

  state = {
    editMode: false,
    title: this.props.mapping.title,
  }

  onVisibleChange = (visible) => {
    this.setState({ editMode: visible });
  }

  onTitleChange = (event) => {
    this.setState({ title: event.target.value });
  }

  get popover() {
    const { param: { title: paramTitle } } = this.props.mapping;

    return (
      <Fragment>
        <Input
          size="small"
          defaultValue={this.state.title}
          placeholder={paramTitle}
          style={{ width: 100, marginRight: 3 }}
          onChange={this.onTitleChange}
          onPressEnter={this.save}
          autoFocus
        />
        <Button size="small" type="dashed" onClick={this.hide} style={{ marginRight: 2 }}>
          <Icon type="close" />
        </Button>
        <Button size="small" type="dashed" onClick={this.save}>
          <Icon type="check" />
        </Button>
      </Fragment>
    );
  }

  save = () => {
    const newMapping = extend({}, this.props.mapping, { title: this.state.title });
    this.props.onChange(newMapping);
    this.hide();
  }

  hide = () => {
    this.setState({ editMode: false });
  }

  render() {
    const { mapping } = this.props;
    const { title, param: { title: paramTitle } } = mapping;

    // TODO css className
    return (
      <span style={{ whiteSpace: 'nowrap' }}>
        {title || paramTitle}
        <Popover
          placement="right"
          trigger="click"
          content={this.popover}
          visible={this.state.editMode}
          onVisibleChange={this.onVisibleChange}
          getPopupContainer={this.props.getContainerElement}
        >
          <Button
            size="small"
            type="dashed"
            style={{ marginLeft: '10px' }}
          >
            <Icon type="edit" />
          </Button>
        </Popover>
      </span>
    );
  }
}

export class ParameterMappingListInput extends React.Component {
  static propTypes = {
    mappings: PropTypes.arrayOf(PropTypes.object),
    existingParamNames: PropTypes.arrayOf(PropTypes.string),
    onChange: PropTypes.func,
    clientConfig: PropTypes.any, // eslint-disable-line react/forbid-prop-types
    Query: PropTypes.any, // eslint-disable-line react/forbid-prop-types
  };

  static defaultProps = {
    mappings: [],
    existingParamNames: [],
    onChange: () => {},
    clientConfig: null,
    Query: null,
  };

  constructor(props) {
    super(props);
    this.wrapperRef = React.createRef();
  }

  updateParamMapping(oldMapping, newMapping) {
    const mappings = [...this.props.mappings];
    const index = findIndex(mappings, oldMapping);
    if (index >= 0) {
      // This should be the only possible case, but need to handle `else` too
      mappings[index] = newMapping;
    } else {
      mappings.push(newMapping);
    }
    this.props.onChange(mappings);
  }

  render() {
    const clientConfig = this.props.clientConfig; // eslint-disable-line react/prop-types
    const Query = this.props.Query; // eslint-disable-line react/prop-types

    const data = this.props.mappings.map(mapping => ({ mapping }));

    return (
      <div ref={this.wrapperRef}>
        <Table dataSource={data} size="middle" pagination={false} rowKey="uid">
          <Table.Column
            title="Title"
            dataIndex="mapping"
            key="title"
            render={mapping => (
              <TitleInput
                mapping={mapping}
                onChange={newMapping => this.updateParamMapping(mapping, newMapping)}
                getContainerElement={() => this.wrapperRef.current}
              />
            )}
          />
          <Table.Column
            title="Keyword"
            dataIndex="mapping"
            key="keyword"
            render={mapping => (
              <code style={{ whiteSpace: 'nowrap' }}>
                {`{{ ${mapping.name} }}`}
              </code>
            )}
          />
          <Table.Column
            title="Default Value"
            dataIndex="mapping"
            key="value"
            render={mapping => (
              mapping.value || mapping.param.normalizedValue
            )}
          />
          <Table.Column
            title="Value Source"
            dataIndex="mapping"
            key="source"
            render={mapping => (
              <SourceInput
                mapping={mapping}
                existingParamNames={this.props.existingParamNames}
                onChange={newMapping => this.updateParamMapping(mapping, newMapping)}
                getContainerElement={() => this.wrapperRef.current}
                clientConfig={clientConfig}
                Query={Query}
              />
            )}
          />
        </Table>
      </div>
    );
  }
}
