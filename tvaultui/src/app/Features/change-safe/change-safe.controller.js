/*
* =========================================================================
* Copyright 2018 T-Mobile, US
* 
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*    http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
* See the readme.txt file for additional language around disclaimer of warranties.
* =========================================================================
*/

'use strict';
(function(app){
    app.controller('ChangeSafeCtrl', function($scope, $rootScope, Modal, $timeout, fetchData, $http, UtilityService, Notifications,
                                              $window, $state, $stateParams, SessionStore, periscopeService, AdminSafesManagement, ModifyUrl){
      $scope.selectedGroupOption = '';            // Selected dropdown value to be used for filtering
      $rootScope.showDetails = true;              // Set true to show details view first
      $scope.similarSafes = 0;
      $rootScope.activeDetailsTab = 'details';
      $scope.typeDropdownDisable = false;         // Variable to be set to disable the dropdown button to select 'type'
      $scope.safeCreated = false;                 // Flag to indicate if a safe has been creted
      $scope.isEditSafe = false;
      $scope.awsRadioBtn = {};                    // Made an object instead of single variable, to have two way binding between
                                                  // modal and controller

      $scope.usrRadioBtnVal = 'read';             // Keep it in lowercase
      $scope.grpRadioBtnVal = 'read';             // Keep it in lowercase
      $scope.awsRadioBtn['value'] = 'read';       // Keep it in lowercase

      $scope.isEmpty = UtilityService.isObjectEmpty;
      $scope.awsConfPopupObj = {
                "role":"",
                "bound_account_id":"",
                "bound_region":"",
                "bound_vpc_id":"",
                "bound_subnet_id":"",
                "bound_ami_id":"",
                "bound_iam_instance_profile_arn":"",
                "bound_iam_role_arn":"",
                "policies":""
      };
      $scope.tableOptions = [
        {
              "type": "User Safe"
        }, {
              "type": "Shared Safe"
        }, {
              "type": "Application Safe"
        }
      ];

      $scope.radio = {
            value: 'read',
            options: [{
                      'text' : 'read'
                      },{
                      'text' : 'write'
                      },{
                      'text' : 'deny'
                      }]
        };

      $scope.detailsNavTags = [{
            displayName: 'DETAILS',
            navigationName: 'details',
            addComma: true,
            show: true
        }, {
            displayName: 'PERMISSIONS',
            navigationName: 'permissions',
            addComma: false,
            show: true
        }];


      $scope.goBack = function () {
        if($scope.goBackToAdmin !== true) {
            if($rootScope.showDetails === true) {
                $state.go('admin');
            }
            else {
                $rootScope.showDetails = true;
                $rootScope.activeDetailsTab = 'details';
            }
        }
        else {
            if ($rootScope.lastVisited) {
                $state.go($rootScope.lastVisited);
            } else
            $state.go('admin');
        }
      }
      $scope.error = function (size) {
          Modal.createModal(size, 'error.html', 'ChangeSafeCtrl', $scope);
      };

      /************************  Functions for autosuggest start here (Taken from periscope) ***************************/
      $scope.periscopeSearch = {
            userName: ''
      };
      $scope.dropDownValArray = {
        'userNameDropdownVal':[]
      }
      $scope.totalDropdownVal = [];
      $rootScope.loadingDropDownData = false;

      var assignDropdownVal = function(variableChanged){
            $scope.dropDownValArray.userNameDropdownVal = [];
      }

      $scope.$watch('periscopeSearch', function(newVal, oldVal) {
            var variableChanged = '';
            if (newVal.userName != undefined && newVal.userName != oldVal.userName) {
                variableChanged = 'userName';
            } 

            if (newVal[variableChanged] != undefined) {
                var enteredVal = newVal[variableChanged].split(","); // periscopeSearch.userName
                var newLetter = enteredVal[enteredVal.length - 1];
                newLetter = newLetter.replace(" ", "");

                if (newLetter.length === 0) {
                    assignDropdownVal(variableChanged);
                    $scope.totalDropdownVal = [];
                    $rootScope.loadingDropDownData = true;
                }

                if (variableChanged === 'permission') {
                    variableChanged = 'actionName';
                }
                $scope.getDropdownDataForPermissions(variableChanged, newLetter);
            } else {
                assignDropdownVal(variableChanged);
            }
        }, true);

      $scope.getDropdownDataForPermissions = function(searchFieldName, searchFieldText) {
            var ADUsersData = JSON.parse(SessionStore.getItem('ADUsers'));
            if((ADUsersData === undefined) || (ADUsersData == null)) {
                periscopeService.getDropdownDataForPermissions(searchFieldName, searchFieldText).then(function(res, error) {
                var serviceData;
                if (res) {
                    serviceData = res;
                    $scope.loadingDataFrDropdown = serviceData.loadingDataFrDropdown;
                    $scope.erroredFrDropdown = serviceData.erroredFrDropdown;
                    $scope.successFrDropdown = serviceData.successFrDropdown;
                    SessionStore.setItem('ADUsers', JSON.stringify(res));
                    massageDataFrPermissionsDropdown(searchFieldName, searchFieldText, serviceData.dataFrmApi);
                } else {
                    serviceData = error;
                    $scope.commonErrorHandler(serviceData.error, serviceData.error || serviceData.response.data, "getDropdownData");

                }
                })
            }
            else {
                var serviceData = ADUsersData;
                if(serviceData.dataFrmApi !== undefined && serviceData.dataFrmApi !== null) {
                    massageDataFrPermissionsDropdown(searchFieldName, searchFieldText, serviceData.dataFrmApi);
                }                
            } 
        };
      $scope.commonErrorHandler = function(error, response, block) {
            if ((block === "requestDataFrPeriscope") || (block === null)) {
                $scope.loadingData = false;
                $scope.errored = true;
                $scope.success = false;
                $scope.nodataavailable = false;
                $scope.loadingAfterDeleting = false;
                $scope.errorMsg = "Please try again, if the issue persists contact Vault Administrator";
                console.log("Data from service is not in expected Format ", error);
                if ((response != undefined) || (response != null)) {
                    if (response.message) {
                        $scope.errorMsg = response.message;
                        console.log(response.message);
                    }
                }
            }
            if (block === "requestRolesFrPeriscope") {
                $scope.loadingDataFrRoles = false;
                $scope.erroredInRoles = true;
                $scope.successInRoles = false;
                $scope.errorMsgFrRoles = "Please try again, if the issue persists contact Vault Administrator";
                console.log("Data from service is not in expected Format ", error);
                if ((response != undefined) || (response != null)) {
                    if (response.message) {
                        $scope.errorMsg = response.message;
                        console.log(response.message);
                    }
                }
            }
        }
      var massageDataFrPermissionsDropdown = function(searchFieldName, searchFieldText, dataFrmApi) {
            var serviceData = periscopeService.massageDataFrPermissionsDropdown(searchFieldName, searchFieldText, dataFrmApi, $scope.dropDownValArray);
            if(serviceData.length > 6) {
                $scope.dropDownValArray.userNameDropdownVal = serviceData.sort().slice(0, 6);
            } else {
                $scope.dropDownValArray.userNameDropdownVal = serviceData;
            }
            $rootScope.loadingDropDownData = false;
        }


    /***************************************  Functions for autosuggest end here **********************************************/

      $scope.safeEditSafe = function () {
          $scope.goBackToAdmin = true;
          var successCondition = true;
          $scope.goBack();
      }
      $scope.getPath = function () {
        var vaultType = '';

          switch ($scope.dropDownOptions.selectedGroupOption.type) {
              case "Application Safe":
                  vaultType = 'apps';
                  break;
              case "User Safe":
                  vaultType = 'users';
                  break;
              case "Shared Safe":
                  vaultType = 'shared';
                  break;
          }

          var setPath = vaultType + '/' + UtilityService.formatName($scope.safe.name);
        //   return encodeURIComponent(setPath);
        return setPath;
      }
      $scope.editPermission = function(type, editMode, user, permission) {
          if(editMode) {
            var editingPermission = true;
            $scope.deletePermission(type, editMode, editingPermission, user, permission);
          }
      }
      $scope.replaceSpaces = function() {
          $scope.safe.name = UtilityService.formatName($scope.safe.name);
      } 

      $scope.deletePermission = function(type, editMode, editingPermission, key, permission) {
          if(editMode) {
            try {
                $scope.isLoadingData = true;
                var setPath = $scope.getPath();
                var apiCallFunction = '';
                var reqObjtobeSent = {};
                switch (type) {
                    case 'users' :
                        apiCallFunction = AdminSafesManagement.deleteUserPermissionFromSafe;
                        reqObjtobeSent = {
                            "path" : setPath,
                            "username" : key
                        };
                        break;
                    case 'groups' :
                        apiCallFunction = AdminSafesManagement.deleteGroupPermissionFromSafe;
                        reqObjtobeSent = {
                            "path" : setPath,
                            "groupname" : key
                        };
                        break;
                    case 'AWSPermission' :
                        apiCallFunction = AdminSafesManagement.deleteAWSPermissionFromSafe;
                        reqObjtobeSent = {
                            "path" : setPath,
                            "role" : key
                        };
                        break;
                }
                apiCallFunction(reqObjtobeSent).then(
                    function(response) {
                        if(UtilityService.ifAPIRequestSuccessful(response)){
                            // Try-Catch block to catch errors if there is any change in object structure in the response
                            try {
                                $scope.isLoadingData = false;
                                if(editingPermission) {
                                    $scope.addPermission(type, key, permission);  // This will be executed when we're editing permissions
                                }
                                else {
                                    $scope.requestDataFrChangeSafe();
                                    var notification = UtilityService.getAParticularSuccessMessage('MESSAGE_SAFE_DELETE');
                                    Notifications.toast(key+"'s permission"+notification);
                                }
                            }
                            catch(e) {
                                console.log(e);
                                $scope.errorMessage = UtilityService.getAParticularErrorMessage('ERROR_PROCESSING_DATA');
                                $scope.error('md');
                            }
                        }
                        else {
                            $scope.errorMessage = AdminSafesManagement.getTheRightErrorMessage(response);
                            error('md');
                        }
                    },
                    function(error) {

                        // Error handling function
                        console.log(error);
                        $scope.isLoadingData = false;
                        $scope.errorMessage = UtilityService.getAParticularErrorMessage('ERROR_GENERAL');
                        $scope.error('md');

                })
            } catch(e) {

                console.log(e);
                $scope.isLoadingData = false;
                $scope.errorMessage = UtilityService.getAParticularErrorMessage('ERROR_GENERAL');
                $scope.error('md');

            }
         }
      }
      $scope.editAWSConfigurationDetails = function (editMode, rolename) {
         if(editMode) {
            try{
                $scope.isLoadingData = true;
                var setPath = $scope.getPath();
                var queryParameters = rolename;
                var updatedUrlOfEndPoint = ModifyUrl.addUrlParameteres('getAwsConfigurationDetails',queryParameters);
                AdminSafesManagement.getAWSConfigurationDetails(null, updatedUrlOfEndPoint).then(
                    function(response) {
                        if(UtilityService.ifAPIRequestSuccessful(response)){
                            // Try-Catch block to catch errors if there is any change in object structure in the response
                            try {
                                // $scope.awsConfPopupObj = response.data;
                                // $scope.awsConfPopupObj['role'] = rolename;
                                $scope.editingAwsPermission = {"status" : true};
                                $scope.awsConfPopupObj = {
                                    "role": rolename,
                                    "bound_account_id": response.data.bound_account_id,
                                    "bound_region": response.data.bound_region,
                                    "bound_vpc_id": response.data.bound_vpc_id,
                                    "bound_subnet_id": response.data.bound_subnet_id,
                                    "bound_ami_id": response.data.bound_ami_id,
                                    "bound_iam_instance_profile_arn": response.data.bound_iam_instance_profile_arn,
                                    "bound_iam_role_arn": response.data.bound_iam_role_arn,
                                    "policies": response.data.policies
                                };
                                $scope.policies = response.data.policies;
                                $scope.awsRadioBtn['value'] = $rootScope.AwsPermissionsData.data[rolename];
                                $scope.open('md');   // open the AWS configuration popup with prefilled data
                            }
                            catch(e) {
                                console.log(e);
                                $scope.isLoadingData = false;
                                $scope.errorMessage = UtilityService.getAParticularErrorMessage('ERROR_PROCESSING_DATA');
                                $scope.error('md');
                            }
                        }
                        else {
                            $scope.errorMessage = AdminSafesManagement.getTheRightErrorMessage(response);
                            error('md');
                        }
                    },
                    function(error) {

                        // Error handling function
                        console.log(error);
                        $scope.isLoadingData = false;
                        $scope.errorMessage = UtilityService.getAParticularErrorMessage('ERROR_GENERAL');
                        $scope.error('md');

                })
            } catch(e) {

                // To handle errors while calling 'fetchData' function
                console.log(e);
                $scope.isLoadingData = false;
                $scope.errorMessage = UtilityService.getAParticularErrorMessage('ERROR_GENERAL');
                $scope.error('md');

            }
         }
      }

      $scope.createSafe = function () {
        if($scope.safeCreated === true) {
            $scope.editSafe();
        }
        else if($scope.dropDownOptions.selectedGroupOption.type === "Select Type") {
            $rootScope.noTypeSelected = true;
        }
        else {
            try{
                $scope.isLoadingData = true;
                var setPath = $scope.getPath();
                $scope.safe.name = UtilityService.formatName($scope.safe.name);
                var payload = {"path":setPath, "data":$scope.safe};

                AdminSafesManagement.createSafe(payload).then(function(response) {
                    if(UtilityService.ifAPIRequestSuccessful(response)){
                        // Try-Catch block to catch errors if there is any change in object structure in the response
                        try {
                            $scope.isLoadingData = false;
                            $rootScope.showDetails = false;               // To show the 'permissions' and hide the 'details'
                            $rootScope.activeDetailsTab = 'permissions';
                            $scope.safeCreated = true;                // Flag set to indicate safe has been created
                            $scope.typeDropdownDisable = true;
                            var notification = UtilityService.getAParticularSuccessMessage('MESSAGE_CREATE_SUCCESS');
                            var currentSafesList = JSON.parse(SessionStore.getItem("allSafes"));
                            currentSafesList.push($scope.safe.name);
                            SessionStore.setItem("allSafes", JSON.stringify(currentSafesList));
                            Notifications.toast($scope.safe.name+' safe'+notification);
                        } catch(e) {
                            console.log(e);
                            $scope.isLoadingData = false;
                            $scope.errorMessage = UtilityService.getAParticularErrorMessage('ERROR_PROCESSING_DATA');
                            $scope.error('md');
                        }
                    }
                    else {
                        $scope.errorMessage = AdminSafesManagement.getTheRightErrorMessage(response);
                        error('md');
                    }
                },
                function(error) {
                    // Error handling function
                    console.log(error);
                    $scope.isLoadingData = false;
                    $scope.errorMessage = UtilityService.getAParticularErrorMessage('ERROR_GENERAL');
                    $scope.error('md');
                })
            } catch(e) {
                // To handle errors while calling 'fetchData' function
                console.log(e);
                $scope.isLoadingData = false;
                $scope.errorMessage = UtilityService.getAParticularErrorMessage('ERROR_GENERAL');
                $scope.error('md');
            }
        }
      }

      $scope.editSafe = function () {
        try{
            $scope.isLoadingData = true;
            var setPath = $scope.getPath();
            var payload = {"path":setPath, "data":$scope.safe};
            AdminSafesManagement.editSafe(payload).then(function(response) {
                if(UtilityService.ifAPIRequestSuccessful(response)){
                    // Try-Catch block to catch errors if there is any change in object structure in the response
                    try {
                        $scope.isLoadingData = false;
                        $rootScope.showDetails = false;               // To show the 'permissions' and hide the 'details'
                        $rootScope.activeDetailsTab = 'permissions';
                        var notification = UtilityService.getAParticularSuccessMessage('MESSAGE_UPDATE_SUCCESS');
                        Notifications.toast($scope.safe.name+' safe'+notification);
                    } catch(e) {
                        console.log(e);
                        $scope.isLoadingData = false;
                        $scope.errorMessage = UtilityService.getAParticularErrorMessage('ERROR_PROCESSING_DATA');
                        $scope.error('md');
                    }
                }
                else {
                    $scope.errorMessage = AdminSafesManagement.getTheRightErrorMessage(response);
                    error('md');
                }
            },
            function(error) {
                // Error handling function
                console.log(error);
                $scope.isLoadingData = false;
                $scope.errorMessage = UtilityService.getAParticularErrorMessage('ERROR_GENERAL');
                $scope.error('md');
            })
        } catch(e) {
            // To handle errors while calling 'fetchData' function
            console.log(e);
            $scope.isLoadingData = false;
            $scope.errorMessage = UtilityService.getAParticularErrorMessage('ERROR_GENERAL');
            $scope.error('md');
        }
      }


      $rootScope.goToPermissions = function () {
        $timeout(function() {
            if($scope.isEditSafe){
                $rootScope.showDetails = false;               // To show the 'permissions' and hide the 'details'
                $rootScope.activeDetailsTab = 'permissions';
                $scope.editSafe();
            }
            else{
                $rootScope.noTypeSelected = false;              
                $scope.createSafe();
            }
        })            
      }


      $scope.requestDataFrChangeSafe = function () {
        $scope.isLoadingData = true;
        if ($stateParams.safeObject) {

          // Prefilled values when editing
          $scope.changeSafeHeader = "EDIT SAFE";
          $scope.isEditSafe = true;
          $scope.typeDropdownDisable = true;
          try{
                var queryParameters = "path="+$stateParams.safeObject.safeType + '/' + $stateParams.safeObject.safe;
                var updatedUrlOfEndPoint = ModifyUrl.addUrlParameteres('getSafeInfo',queryParameters);
                AdminSafesManagement.getSafeInfo(null, updatedUrlOfEndPoint).then(
                    function(response) {
                        if(UtilityService.ifAPIRequestSuccessful(response)){

                            if($rootScope.showDetails !== true) {
                                document.getElementById('addUser').value='';
                                document.getElementById('addGroup').value='';
                            }
                            // Try-Catch block to catch errors if there is any change in object structure in the response
                            try {
                                $scope.isLoadingData = false;
                                var object = response.data.data;
                                $scope.UsersPermissionsData = object.users;
                                $scope.GroupsPermissionsData = object.groups;
                                $rootScope.AwsPermissionsData = {
                                    "data" : object['aws-roles']
                                }
                                $scope.safe = {
                                name: decodeURIComponent(object.name) || $stateParams.safeObject.safe,
                                owner: decodeURIComponent(object.owner) || $stateParams.safeObject.owner || '',
                                description: decodeURIComponent(object.description) || $stateParams.safeObject.description || '',
                                type: decodeURIComponent(object.type) || $stateParams.safeObject.type || $scope.dropDownOptions.selectedGroupOption.type || ''
                                }
                                $scope.selectedGroupOption = $scope.safe;
                                $scope.dropDownOptions = {
                                'selectedGroupOption': $scope.selectedGroupOption,
                                'tableOptions': $scope.tableOptions
                                }
                            }
                            catch(e) {
                                console.log(e);
                                $scope.isLoadingData = false;
                                $scope.errorMessage = UtilityService.getAParticularErrorMessage('ERROR_PROCESSING_DATA');
                                $scope.error('md');
                            }
                        }
                        else {
                            $scope.errorMessage = AdminSafesManagement.getTheRightErrorMessage(response);
                            error('md');
                        }
                    },
                    function(error) {
                        // Error handling function
                        if($rootScope.showDetails !== true) {
                            document.getElementById('addUser').value='';
                            document.getElementById('addGroup').value='';
                        }
                        console.log(error);
                        $scope.isLoadingData = false;
                        $scope.errorMessage = UtilityService.getAParticularErrorMessage('ERROR_GENERAL');
                        $scope.error('md');

                })
            } catch(e) {
                // To handle errors while calling 'fetchData' function
                if($rootScope.showDetails !== true) {
                    document.getElementById('addUser').value='';
                    document.getElementById('addGroup').value='';
                }
                console.log(e);
                $scope.isLoadingData = false;
                $scope.errorMessage = UtilityService.getAParticularErrorMessage('ERROR_GENERAL');
                $scope.error('md');

            }

        }
        else{
          $scope.changeSafeHeader = "CREATE SAFE";
          $scope.isEditSafe = false;

          // Refreshing the data while adding/deleting/editing permissions when creating safe (not edit-safe)

          try{  
                $rootScope.AwsPermissionsData = {}
                if(($scope.safe.name !== '') && ($scope.safe.owner !== '')) {
                    var queryParameters = "path="+ $scope.getPath();
                    var updatedUrlOfEndPoint = ModifyUrl.addUrlParameteres('getSafeInfo',queryParameters);
                    AdminSafesManagement.getSafeInfo(null, updatedUrlOfEndPoint).then(
                        function(response) {
                            if(UtilityService.ifAPIRequestSuccessful(response)){
                                // Try-Catch block to catch errors if there is any change in object structure in the response
                                try {
                                    $scope.isLoadingData = false;
                                    var object = response.data.data;
                                    $scope.UsersPermissionsData = object.users;
                                    $scope.GroupsPermissionsData = object.groups;
                                    $rootScope.AwsPermissionsData = {
                                        "data" : object['aws-roles']
                                    }
                                }
                                catch(e) {
                                    console.log(e);
                                    $scope.isLoadingData = false;
                                    $scope.errorMessage = UtilityService.getAParticularErrorMessage('ERROR_PROCESSING_DATA');
                                    $scope.error('md');
                                }
                            }
                            else {
                                $scope.errorMessage = AdminSafesManagement.getTheRightErrorMessage(response);
                                error('md');
                            }
                        },
                        function(error) {
                            // Error handling function
                            console.log(error);
                            $scope.isLoadingData = false;
                            $scope.errorMessage = UtilityService.getAParticularErrorMessage('ERROR_GENERAL');
                            $scope.error('md');

                    });
                }
                else {
                    $scope.isLoadingData = false;
                }
            } catch(e) {
                // To handle errors while calling 'fetchData' function
                console.log(e);
                $scope.isLoadingData = false;
                $scope.errorMessage = UtilityService.getAParticularErrorMessage('ERROR_GENERAL');
                $scope.error('md');

            }

        }
      }

      $scope.init = function () {
        $scope.safe = {
            name: '',
            owner: '',
            description: '',
            type: ''
        };
        $scope.dropDownOptions = {
            'selectedGroupOption': { "type" : "Select Type"},       // As initial placeholder
            'tableOptions': $scope.tableOptions
        }
        $scope.allSafesList = JSON.parse(SessionStore.getItem("allSafes"));        
        $scope.myVaultKey = SessionStore.getItem("myVaultKey");
        $scope.getDropdownDataForPermissions('', '');
        $scope.requestDataFrChangeSafe();
        $scope.fetchUsers();
        $scope.fetchGroups();
      }

      $scope.userNameValEmpty = false;
      $scope.grpNameValEmpty = false;

      $scope.fetchUsers = function() {
                    
      }

      $scope.fetchGroups = function() {
          
      }

      $scope.addPermission = function (type, key, permission) {
        if( (key!='' && key != undefined) || type == 'AwsRoleConfigure'){
          try{
            Modal.close('');
            $scope.isLoadingData = true;
            var setPath = $scope.getPath();
            var apiCallFunction = '';
            var reqObjtobeSent = {};
            if(key !== null && key !== undefined) {
                key = UtilityService.formatName(key);
            }
            if($scope.awsConfPopupObj.role !== null && $scope.awsConfPopupObj.role !== undefined) {
                $scope.awsConfPopupObj.role = UtilityService.formatName($scope.awsConfPopupObj.role);
            }
            switch (type) {
                case 'users' :
                    apiCallFunction = AdminSafesManagement.addUserPermissionForSafe;
                    reqObjtobeSent = {"path":setPath,"username": key, "access": permission.toLowerCase()};
                    break;
                case 'groups' :
                    apiCallFunction = AdminSafesManagement.addGroupPermissionForSafe;
                    reqObjtobeSent = {"path":setPath,"groupname": key, "access": permission.toLowerCase()};
                    break;
                case 'AWSPermission' :
                    apiCallFunction = AdminSafesManagement.addAWSPermissionForSafe;
                    reqObjtobeSent = {"path":setPath,"role": key, "access": permission.toLowerCase()};
                    break;
                case 'AwsRoleConfigure' :
                    $scope.awsConfPopupObj['policies'] = "";   // Todo: Because of unavailability of edit service, this has been put
                    if($scope.editingAwsPermission.status == true) {
                        apiCallFunction = AdminSafesManagement.updateAWSRole;
                    } else {
                        apiCallFunction = AdminSafesManagement.addAWSRole;
                    }                        
                    reqObjtobeSent = $scope.awsConfPopupObj
                    break;
            }
            apiCallFunction(reqObjtobeSent).then(function(response) {
                    if(UtilityService.ifAPIRequestSuccessful(response)) {
                        // Try-Catch block to catch errors if there is any change in object structure in the response
                        try {
                            $scope.isLoadingData = false;
                            if(type === 'AwsRoleConfigure') {
                                $scope.addPermission('AWSPermission', $scope.awsConfPopupObj.role, permission);
                            }
                            else {
                                $scope.requestDataFrChangeSafe();
                                var notification = UtilityService.getAParticularSuccessMessage('MESSAGE_ADD_SUCCESS');
                                if(key !== null && key !== undefined) {
                                    Notifications.toast(key+"'s permission"+notification);
                                }
                            }                            
                        } catch(e) {
                                console.log(e);
                                $scope.isLoadingData = false;
                                $scope.errorMessage = UtilityService.getAParticularErrorMessage('ERROR_PROCESSING_DATA');
                                $scope.error('md');
                        }
                    }
                    else {
                        $scope.errorMessage = AdminSafesManagement.getTheRightErrorMessage(response);
                        error('md');
                    }
                },
                function(error) {
                    // Error handling function
                    console.log(error);
                    $scope.isLoadingData = false;
                    $scope.errorMessage = UtilityService.getAParticularErrorMessage('ERROR_GENERAL');
                    $scope.error('md');
                })
          } catch(e) {
            // To handle errors while calling 'fetchData' function
            $scope.isLoadingData = false;
            console.log(e);
            $scope.errorMessage = UtilityService.getAParticularErrorMessage('ERROR_GENERAL');
            $scope.error('md');
          }
        }
      }

      $scope.newAwsConfiguration = function(size) {
            // To reset the aws configuration details object to create a new one
            $scope.editingAwsPermission = {"status" : false};
            $scope.awsConfPopupObj = {
                "role":"",
                "bound_account_id":"",
                "bound_region":"",
                "bound_vpc_id":"",
                "bound_subnet_id":"",
                "bound_ami_id":"",
                "bound_iam_instance_profile_arn":"",
                "bound_iam_role_arn":"",
                "policies":""
            };
            $scope.open(size);
      }

      /* TODO: What is open, functon name should be more descriptive */
      $scope.open = function (size) {
          Modal.createModal(size, 'changeSafePopup.html', 'ChangeSafeCtrl', $scope);
      };

        /* TODO: What is ok, functon name should be more descriptive */
      $scope.ok = function () {
          Modal.close('ok');
          $scope.isLoadingData = false;
      };

        /* TODO: What is next, functon name should be more descriptive */
      $scope.next = function () {
        $scope.addAWSRoleSafe();
        // $scope.openAWSConfFinal('md');

      };

        /* TODO: What is cancel, functon name should be more descriptive */
      $scope.cancel = function () {
          Modal.close('close');
          $scope.isLoadingData = false;
      };

    // TO-BE-CHECKED : Function currently not in use

    //   $scope.getUsernamesAndGroups = function(){       
    //       var url = "https://example.com/get-all-ad-users";
    //       var headers = {
    //           "authorization": "",
    //           "cache-control": "",
    //           "postman-token": ""
    //       }

    //       fetchData.getActionData(null, url, headers).then(
    //           function(response){
    //             console.log("All AD Users = ");
    //             console.log(response);
    //           },
    //           function(error){
    //               console.log("error = ");
    //               $scope.errorMessage = UtilityService.getAParticularErrorMessage('ERROR_GENERAL');
    //               console.log(error);
    //           }
    //       );
    //   };

      $scope.init();

    });
})(angular.module('pacman.features.ChangeSafeCtrl',[
    'pacman.services.AdminSafesManagement',
    'pacman.services.ModifyUrl'
]));
