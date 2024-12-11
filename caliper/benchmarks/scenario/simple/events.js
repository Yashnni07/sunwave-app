/*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

'use strict';

const OperationBase = require('./utils/operation-base');
const SimpleState = require('./utils/simple-state');

/**
 * Workload module for initializing the SUT with various accounts.
 */
class Open extends OperationBase {

    /**
     * Initializes the parameters of the workload.
     */
    constructor() {
        super();
    }

    /**
     * Create an empty state representation.
     * @return {SimpleState} The state instance.
     */
    createSimpleState() {
        return new SimpleState(this.workerIndex, this.initialMoney, this.moneyToTransfer);
    }

    /**
     * Assemble TXs for opening new accounts.
     */
    async submitTransaction() {
        // Define the event type for the query (you can pass it as an argument or set a default value)
        const eventType = "normal";  // You can replace this with a dynamic parameter or configuration
    
        // Prepare the arguments to query events
        const queryArgs = [eventType];
    
        // Call the chaincode function getEvents with the appropriate arguments
        await this.sutAdapter.sendRequests(
            this.createConnectorRequest('getEvents', queryArgs)
        );
    }
}

/**
 * Create a new instance of the workload module.
 * @return {WorkloadModuleInterface}
 */
function createWorkloadModule() {
    return new Open();
}

module.exports.createWorkloadModule = createWorkloadModule;
