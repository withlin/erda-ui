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

import agent from 'agent';

export const getCloudRegion = (payload: CLOUD.RegionQuery): CLOUD.Region[] => {
  return agent.get('/api/cloud-region')
    .query(payload)
    .then((response: any) => response.body);
};

export const setCloudResourceTags = (data: CLOUD.SetTagBody) => {
  return agent.post('/api/cloud-resource/set-tag')
    .send(data)
    .then((response: any) => response.body);
};
