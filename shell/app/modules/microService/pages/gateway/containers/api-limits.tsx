// Copyright (c) 2021 Terminus, Inc.
//
// This program is free software: you can use, redistribute, and/or modify
// it under the terms of the GNU Affero General Public License, version 3
// or later ("AGPL"), as published by the Free Software Foundation.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program. If not, see <http://www.gnu.org/licenses/>.

import * as React from 'react';
import { isEmpty } from 'lodash';
import { Button, Select, Input, InputNumber, Modal, Spin } from 'app/nusi';
import { PagingTable, FormModal, useSwitch } from 'common';
import { API_LIMIT_COLS, HTTP_METHODS } from '../config';
import { insertWhen } from 'common/utils';
import i18n from 'i18n';
import { useLoading } from 'app/common/stores/loading';
import { ColumnProps } from 'core/common/interface';
import './api-limits.scss';
import gatewayStore from 'microService/stores/gateway';
import { useMount } from 'react-use';

const { Option } = Select;
const { Group: InputGroup } = Input;
const { confirm } = Modal;

interface ILimit {
  id: string;
  consumerId: string;
  consumerName: string;
  packageId: string
  packageName: string;
  method: string;
  apiPath: string;
  limit: { qpd?: number, qpm?: number, qph?: number, qps?: number };
}

enum LIMIT_TYPE {
  ONE = 'one',
  ALL = 'all',
}

export const PureApiLimits = () => {
  const defaultLimitType = LIMIT_TYPE.ALL;
  // const [filter, setFilter] = React.useState({} as any);
  const [effectFilter, setEffectFilter] = React.useState({} as any);
  const [modalVisible, openModal, _closeModal] = useSwitch(false);
  const [method, setMethod] = React.useState('GET');
  const [limitType, setLimitType] = React.useState(defaultLimitType);
  const [formData, setFormData] = React.useState({} as any);
  const [apiFilterCondition, paging, apiLimits] = gatewayStore.useStore(s => [s.apiFilterCondition, s.apiLimitsPaging, s.apiLimits]);

  const { getApiFilterCondition, getApiLimits, deleteLimit, createApiLimit, updateApiLimit } = gatewayStore.effects;
  const [isGetFilter, isGetLimit] = useLoading(gatewayStore, ['getApiFilterCondition', 'getApiLimits']);
  const isFetching = isGetFilter || isGetLimit;
  useMount(() => {
    getApiFilterCondition();
  });

  // const { apiConsumer, apiPackage } = filter;
  const { apiPackages = [], apiConsumers = [] } = apiFilterCondition;
  const selectBefore = (
    <Select value={method} onChange={setMethod} dropdownMatchSelectWidth={false}>
      {HTTP_METHODS.map(item => <Option key={item.name} className="method-option" value={item.value}>{item.name}</Option>)}
    </Select>);

  React.useEffect(() => {
    getApiLimits({ ...effectFilter, pageNo: 1 });
  }, [effectFilter, getApiLimits]);

  const onSearch = (pagination?: { pageNo: number }) => {
    const { pageNo = 1 } = pagination || {};
    getApiLimits({ ...effectFilter, pageNo });
  };

  // const onReset = () => {
  //   setFilter({});
  //   setEffectFilter({});
  // };

  // const onSearchClick = () => {
  //   setEffectFilter({ ...filter });
  // };

  const closeModal = () => {
    _closeModal();
    setFormData({});
    setLimitType(defaultLimitType);
    setMethod('GET');
    setLimitType(defaultLimitType);
  };

  const onCreateUpdate = (data: any, addMode: any) => {
    const { id, apiPath, limitType: noUsed, ...restData } = data;
    const limitData = apiPath ? { ...restData, method, apiPath } : { ...restData };
    if (addMode) {
      createApiLimit(limitData).then(() => getApiLimits({ ...effectFilter, pageNo: 1 }));
    } else {
      updateApiLimit({ ruleId: id, ...limitData }).then(() => getApiLimits({ ...effectFilter, pageNo: 1 }));
    }
    closeModal();
  };

  const editForm = (record: ILimit) => {
    setLimitType(record.apiPath ? LIMIT_TYPE.ONE : LIMIT_TYPE.ALL);
    setFormData(record);
    setMethod(record.method || 'GET');
    openModal();
  };

  const onDelete = (record: ILimit) => {
    deleteLimit({ ruleId: record.id }).then(() => onSearch());
  };

  const editMode = !!formData.id;
  const fieldsList = [
    {
      name: 'id',
      required: false,
      itemProps: { type: 'hidden' },
    },
    {
      name: 'packageId',
      required: false,
      itemProps: { type: 'hidden' },
    },
    {
      label: i18n.t('microService:consumer name'),
      name: 'consumerId',
      type: 'select',
      options: apiConsumers && apiConsumers.map(consumer => ({ name: consumer.name, value: consumer.id })),
      itemProps: { disabled: !isEmpty(formData) },
    },
    {
      label: i18n.t('microService:limit type'),
      name: 'limitType',
      type: 'select',
      initialValue: editMode
        ? formData.apiPath ? LIMIT_TYPE.ONE : LIMIT_TYPE.ALL
        : limitType,
      options: [
        { value: LIMIT_TYPE.ALL, name: i18n.t('microService:all') },
        { value: LIMIT_TYPE.ONE, name: i18n.t('microService:specify path') },
      ],
      itemProps: {
        onChange: (val: string) => setLimitType(val),
      },
    },
    ...insertWhen(limitType === LIMIT_TYPE.ONE, [{
      label: i18n.t('microService:api method path'),
      name: 'apiPath',
      itemProps: {
        placeholder: i18n.t('microService:please enter the api already in the endpoint'),
        spellCheck: false,
        addonBefore: selectBefore,
      },
    }]),
    {
      label: i18n.t('microService:traffic limit'),
      name: 'limit',
      config: { initialValue: formData.limit || { qps: 1 } },
      getComp: ({ form: { getFieldValue, setFieldsValue } }: any) => {
        const fieldValue = getFieldValue('limit') || {};
        const targetUnit = Object.keys(fieldValue).length > 0 ? Object.keys(fieldValue)[0] : 'qps';
        const limitValue = Object.keys(fieldValue).length > 0 ? fieldValue[targetUnit] : 1;
        return (
          <>
            <InputGroup compact>
              <InputNumber
                min={1}
                maxLength={10}
                style={{ width: '70%' }}
                value={limitValue}
                onChange={(value) => {
                  setFieldsValue({ limit: { [targetUnit]: Math.round(Number(value) || 0) } });
                }}
                placeholder={i18n.t('microService:please key in numbers')}
              />
              <Select
                style={{ width: '30%' }}
                value={targetUnit || 'qps'}
                onSelect={(unit: string) => {
                  setFieldsValue({ limit: { [unit]: limitValue } });
                }}
              >
                <Option value="qps">{i18n.t('microService:times/second')}</Option>
                <Option value="qpm">{i18n.t('microService:times/minutes')}</Option>
                <Option value="qph">{i18n.t('microService:times/hour')}</Option>
                <Option value="qpd">{i18n.t('microService:times/day')}</Option>
              </Select>
            </InputGroup>
          </>
        );
      },
    },
  ];

  const columns:Array<ColumnProps<ILimit>> = [
    ...API_LIMIT_COLS,
    {
      title: i18n.t('operations'),
      width: 150,
      render: (record: ILimit) => {
        return (
          <div className="table-operations">
            <span className="table-operations-btn" onClick={() => editForm(record)}>{i18n.t('microService:edit')}</span>
            <span
              className="table-operations-btn"
              onClick={() => confirm({
                title: i18n.t('microService:confirm deletion?'),
                onOk: () => onDelete(record),
              })}
            >
              {i18n.t('microService:delete')}
            </span>
          </div>
        );
      },
    },
  ];

  return (
    <div className="api-limits">
      <Spin spinning={isFetching}>
        <div className="mb16">
          <Button type="primary" onClick={openModal}>{i18n.t('microService:create call control')}</Button>
        </div>
        {/* <div className="mb16 flex-box">
          <div className="nowrap api-filter">
            <Select placeholder={i18n.t('microService:consumer')} value={apiConsumer} onChange={(value: string) => setFilter({ ...filter, apiConsumer: value })} className="filter-select mr16">
              {apiConsumers.map(({ id, name }) => <Option key={id} value={id}>{name}</Option>)}
            </Select>
            <Select placeholder={i18n.t('microService:endpoint')} value={apiPackage} onChange={(value: string) => setFilter({ ...filter, apiPackage: value })} className="filter-select mr16">
              {apiPackages.map(({ id, name }) => <Option key={id} value={id}>{name}</Option>)}
            </Select>
          </div>
          <div className="nowrap filter-btn">
            <Button className="ml16 mr8" onClick={onReset}>{i18n.t('microService:reset')}</Button>
            <Button type="primary" ghost onClick={onSearchClick}>{i18n.t('search')}</Button>
          </div>
        </div> */}
      </Spin>
      <PagingTable
        isForbidInitialFetch
        dataSource={apiLimits}
        total={paging.total}
        columns={columns}
        rowKey="id"
        getList={onSearch}
      />
      <FormModal
        width="600px"
        name={i18n.t('microService:call control')}
        fieldsList={fieldsList}
        visible={modalVisible}
        formData={formData}
        onOk={onCreateUpdate}
        onCancel={closeModal}
        modalProps={{ destroyOnClose: true }}
        destroyOnClose
      />
    </div>
  );
};


export const ApiLimits = PureApiLimits;
