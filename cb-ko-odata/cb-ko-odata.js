//option:
//{
//  baseUrl: string
//  fetchHttpMethod: "GET" or "POST" (Get is the default value)
//  fetchGetValueFunc:  default is undefined, then when get data, will read data.value to get data from server, this is the default way for OData, but in some situation that server doesn't return 
//    data in this way, then user can define the custom function to get the data. this function has three parameter fetchGetValueFunc(data, textStatus, jqXHR)
//  getTotalCountUrl:  function(baseUrl), return the url that get total count
//  parseTotalCount: function(odata), parse the total count from the odata result
//  getTotalCountMethod: string, "get" or "post"
//  getDataItemKey: function(dataItem) //return the value of the key of the dataItem, normally, the dataItem is alrady converted to plan json object
//  onBeginSaving: function() //will be called when begin to save all items
//  onEndSaving: function(hasError:bool, hasChanges:bool)  //will be called when the save finished
//  dateProperties: 
//     if is the array of string, then it is the array of all the properites that should be of the type date, and if the date string is generic, then they should be parsed as Utc (if the date string is specified with Z or timezone, then it will be parsed exactly)
//     if is the array of object, then each object should be {name:****, asUtc:true/false}, the name is the property name, the asUtc means the generic time string should be parsed as Utc time or local time (if the date string is specified with Z or timezone, then it will be parsed exactly)
//  onBeginFetch: function() will be called when before the fetch start
//  onEndFetchPreProcessItems:   function(bool, oDataCollection, fetchedItemsArray, processFinishedCallback) 
//                will be called after the fetch is finished, user can override this method to provide a pre process function before these items save to items observable array, 
//                the firt param is diticate if the fetch is successful or not, 
//                the second param is the oDataCollection it self
//                the third param is the fetched items array
//                the forth param is the callback (function(processedItems)) when all the process is finihsed, the processedItems is the array that contains all processed items
//  onAsyncActionBegin:, onAsyncActionEnd: function (action), when there is an async action started, the begin method will be called, and after the async method is end, the end method will be called
//                      normally, the tow methods are the place to show waiting dialog and so on, the action parameter is the action method name, it can be FETCH, SAVE, UPADTEPAGESCOUNT
//  itemsCountOnePage: the items count of one page, 0 get all items, if not provided, then use ODataCollection.defaultItemsCountOnePage as the default value
//  validateHttpResponse: function(action, responseData, textStatus, jqXHR), this function is uused to check if the server response data is the validate, in some case, for example, the session time out, the request
//                          will be finally navigated to the login page, not the requestd data, so use this function to check
//                          this function should return true or false to indicate the response result is correct or not
//                          if not provided, will try to check if ODataCollection has this function, is not, then will not vliadate
//                         action: ODataCollection.actions.save_new/save_change/save_del/fetch/fetchPageCount/api
//  httpHeaders: header send to server
//  cacheForAjax: default is undefined
//}
var ODataCollection = function (option) {
    var __ = { UO: ko.utils.unwrapObservable };
    var crud = ko.bindingHandlers.tableCRUD;
    ODataCollection.actions = {
        save_new: "save_new",
        save_change: "save_change",
        save_del: "save_del",
        fetch: "fetch",
        fetchPageCount: "fetchPageCount",
        api: "api"
    };
    if (!option.getDataItemKey) {
        option.getDataItemKey = function (dataItem) {
            var idNames = ["id", "Id", "ID"];
            for (var i = 0; i < idNames.length; i++) {
                if (typeof (dataItem[idNames[i]]) !== "undefined") {
                    return __.UO(dataItem[idNames[i]]);
                }
            }
            throw "Can't find the id of the dataItem";
        };
    }

    if (!option.fetchHttpMethod) {
        option.fetchHttpMethod = "GET";
    }

    if (typeof (option.itemsCountOnePage) === "undefined") {
        option.itemsCountOnePage = ODataCollection.defaultItemsCountOnePage;
    }

    function notify(type, title, message, autoHide, modal) {
        if (option.notify) {
            option.notify(type, title, message, autoHide, modal);
        } else if (ODataCollection.notify) {
            ODataCollection.notify(type, title, message, autoHide, modal)
        } else {

        }
    }

    //convert a ISO format string to the Date object
    //asUtc default is true, means if the date str is not exclipted specifies time zone or UTC, then parse it as utc time, otherwise parse it as local time
    function tryParseDate(date, asUtc) {
        if (typeof (date) == "undefined" || date == null || date instanceof Date) {
            return date;
        }
        if (typeof (asUtc) === "undefined") {
            asUtc = true;
        }

        var year = parseInt(date.slice(0, 4), 10);
        var month = parseInt(date.slice(5, 7), 10) - 1;
        var day = parseInt(date.slice(8, 10), 10);

        var hour = 0;
        var minute = 0;
        var second = 0;
        var milSecond = 0;
        var TIndex = date.indexOf("T");
        if (TIndex > 0) { //has time
            var timeEndIndex = date.length;
            if (date.indexOf("Z") > 0 || date.indexOf("+", TIndex) > 0 || date.indexOf("-", TIndex) > 0) {
                timeEndIndex = date.indexOf("Z");
                if (timeEndIndex < 0) {
                    timeEndIndex = date.indexOf("+", TIndex);
                }
                if (timeEndIndex < 0) {
                    timeEndIndex = date.indexOf("-", TIndex);
                }
            }
            var timeStr = date.slice(date.indexOf("T") + 1, timeEndIndex);
            if (timeStr.indexOf(":") >= 0) {
                hour = parseInt(timeStr.slice(0, 2), 10);
                minute = parseInt(timeStr.slice(3, 5), 10);
                if (timeStr.length > 6) {
                    second = parseInt(timeStr.slice(6, 8), 10);
                    if (timeStr.indexOf(".") > 0) {
                        milSecond = parseInt(timeStr.slice(9, 12), 10);
                    }
                }
            } else {
                hour = parseInt(timeStr.slice(0, 2), 10);
                minute = parseInt(timeStr.slice(2, 4), 10);
                if (timeStr.length > 4) {
                    second = parseInt(timeStr.slice(4, 6), 10);
                }
            }
        }

        var result = new Date();

        if (date.indexOf("Z") > 0) {
            result.setUTCFullYear(year, month, day);
            result.setUTCHours(hour, minute, second, milSecond);
        }
        else if (TIndex > 0 && (date.indexOf("+", TIndex) > 0 || date.indexOf("-", TIndex) > 0)) {
            var a = 1;
            var offsetIndex = date.indexOf("+", TIndex);
            if (offsetIndex < 0) {
                offsetIndex = date.indexOf("-", TIndex);
                a = -1;
            }
            var offset = parseInt(date.slice(offsetIndex + 1), 10);
            var offsetHour = 0;
            var offsetMinute = 0;
            if (offset.indexOf(":") > 0) {
                offsetHour = parseInt(offset.slice(0, 2), 10);
                offsetMinute = parseInt(offset.slice(3, 5), 10);
            } else {
                offsetHour = parseInt(offset.slice(0, 2), 10);
                offsetMinute = parseInt(offset.slice(2, 4), 10);
            }
            offsetHour = offsetHour * a;
            offsetMinute = offsetMinute * a;
            hour += offsetHour;
            minute += offsetMinute;
            if (minute >= 60) {
                if (minute >= 120) {
                    throw "minutes more than 119";
                }
                hour += 1;
                minute -= 60;
            } else if (minute < 0) {
                hour -= 1;
                minute += 60;
            }
            if (hour < 0) {
                day -= 1;
                hour += 24;
            }
            result.setUTCFullYear(year, month, day);
            result.setUTCHours(hour, minute, second, milSecond);
        } else {
            if (asUtc) {
                result.setUTCFullYear(year, month, day);
                result.setUTCHours(hour, minute, second, milSecond);
                result.setUTCMilliseconds(milSecond);
            } else {
                result.setFullYear(year, month, day);
                result.setHours(hour, minute, second, milSecond);
                result.setMilliseconds(milSecond);
            }
        }

        return result;
    }

    ;

    //convert all properites in the "properties" of dateItme to the Date object
    //properties should be array of properties information object that is {name:***, asUTC:***}
    function parseDateProps(dateItem, properties) {
        if (typeof (properties) == "undefined") {
            return;
        }
        if (!$.isArray(properties)) {
            properties = [{ name: properties }];
        }
        for (var j = 0; j < properties.length; j++) {
            if (typeof (properties[j]) === "string") {
                properties[j] = { name: properties[j] };
            }
        }
        for (var i = 0; i < properties.length; i++) {
            if (!(properties[i].name in dateItem)) {
                continue;
            }
            dateItem[properties[i].name] = tryParseDate(dateItem[properties[i].name], properties[i].asUtc);
        }
    };

    function validateResponse(action, responseData, textStatus, jqXHR) {
        if (option.validateHttpResponse) {
            return option.validateHttpResponse(action, responseData, textStatus, jqXHR);
        }
        if (ODataCollection.validateHttpResponse) {
            return ODataCollection.validateHttpResponse(action, responseData, textStatus, jqXHR);
        }
        return true;
    }

    function addItem(url, dataItem) {
        dataItem = ODataCollection.refinePropForoData(ODataCollection.dataItemToPlainObject(dataItem));
        var ajaxOpt = {
            type: "POST",
            url: url,
            data: dataItem
        };
        if (option.httpHeaders) {
            ajaxOpt.headers = option.httpHeaders;
        }
        return $.ajax(ajaxOpt).fail(function (jqXHR, textStatus, errorThrown) {
            notify('error', undefined, oDataModelResource.AddError + errorThrown);
        });
    };

    function changeItem(url, dataItem) {
        dataItem = ODataCollection.refinePropForoData(ODataCollection.dataItemToPlainObject(dataItem));
        var ajaxOpt = {
            type: "PUT",
            url: url + "(" + option.getDataItemKey(dataItem) + ")",
            data: dataItem
        };
        if (option.httpHeaders) {
            ajaxOpt.headers = option.httpHeaders;
        }
        return $.ajax(ajaxOpt).fail(function (jqXHR, textStatus, errorThrown) {
            notify('error', undefined, oDataModelResource.ChangeError + errorThrown);
        });
    };

    function deleteItem(url, dataItem) {
        dataItem = ODataCollection.refinePropForoData(ODataCollection.dataItemToPlainObject(dataItem));
        var ajaxOpt = {
            type: "DELETE",
            url: url + "(" + option.getDataItemKey(dataItem) + ")" /*,
            data: dataItem*/
        };
        if (option.httpHeaders) {
            ajaxOpt.headers = option.httpHeaders;
        }
        return $.ajax(ajaxOpt).fail(function (jqXHR, textStatus, errorThrown) {
            notify('error', undefined, oDataModelResource.DeleteError + errorThrown);
        });
    };

    function updateObservableArrayOfKOVMWithJsonObj(observableArray, jsonObjectsArray) {
        if (!jsonObjectsArray) {
            jsonObjectsArray = [];
        }

        for (var i = 0; i < jsonObjectsArray.length; i++) {
            jsonObjectsArray[i] = jsonObjectToKoViewModel(jsonObjectsArray[i]);
        }

        observableArray(jsonObjectsArray);
    }

    function combineUrlWithParam(url, param) {
        if (url.indexOf("?") < 0) {
            url += "?";
        }
        if (url[url.length - 1] != "?") {
            url += "&";
        }
        url += param;
        return url;
    }

    function _oDataCollection() {
        var self = this;
        self.TYPE = function () {
            return "_oDataCollection";
        };

        self.baseUrl = ko.observable();
        if (option.baseUrl) {
            self.baseUrl(option.baseUrl);
        }

        self.filter = ko.observable();
        self.orderby = ko.observable();

        self.items = ko.observableArray();


        if (option.itemsCountOnePage) {
            self.itemsCountOnePage = ko.observable(option.itemsCountOnePage);
        } else {
            self.itemsCountOnePage = ko.observable(0);
        }

        self.currentPageIndex = ko.observable(-1);
        self.totalCount = ko.observable(0); //total records count
        self.pagesCount = ko.computed(function () {
            if (self.itemsCountOnePage() <= 0) {
                return 0;
            }
            var pc = parseInt(self.totalCount() / self.itemsCountOnePage());
            if (pc * self.itemsCountOnePage() < self.totalCount()) {
                pc += 1;
            }
            return pc;
        }, this);

        self.addJsonItem = function (json) {
            self.items.push(jsonObjectToKoViewModel(json));
        };

        self.unshiftJsonItem = function (json) {
            self.items.unshift(jsonObjectToKoViewModel(json));
        };

        self.clear = function (resetPages) {
            self.items.removeAll();
            self.currentPageIndex(-1);
            if (typeof (resetPages) === "undefined") {
                resetPages = true;
            }
            if (resetPages) {
                self.totalCount(0);
            }
        };

        self.save = function (saveFinishedCallback) {
            self.saveItem(0, undefined, saveFinishedCallback, true);
        };

        self.saveItem = function (itemIndex, itemStatus, saveFinishedCallback, continueToNext) {
            if (itemIndex < 0 || itemIndex >= __.UO(self.items).length) {
                return;
            }

            var delTag = "****";
            var hasError = false;
            var hasChanges = false;
            var firstStartChange = true;
            var totalNumMayChanged = false;

            if (typeof (itemStatus) === "function") {
                continueToNext = saveFinishedCallback;
                saveFinishedCallback = itemStatus;
                itemStatus = undefined;
            }
            if (typeof (continueToNext) === "undefined") {
                continueToNext = false;
            }

            if (itemStatus) {
                crud.modelStatus(__.UO(self.items)[itemIndex], itemStatus);
            }

            function save(index, finishCallback) {
                if (index < 0 || index >= __.UO(self.items).length || ((!continueToNext) && index !== itemIndex)) {
                    finishCallback();
                    return;
                }
                var dataItem = __.UO(self.items)[index];

                var jqAjax = undefined;
                var action = undefined;
                switch (crud.modelStatus(dataItem)) {
                    case crud.modelStatusConsts.Normal:
                        break;
                    case crud.modelStatusConsts.New:
                        action = ODataCollection.actions.save_new;
                        hasChanges = true;
                        totalNumMayChanged = true;
                        jqAjax = addItem(option.baseUrl, dataItem);
                        break;
                    case crud.modelStatusConsts.Changed:
                        action = ODataCollection.actions.save_change;
                        hasChanges = true;
                        jqAjax = changeItem(option.baseUrl, dataItem);
                        break;
                    case crud.modelStatusConsts.Deleted:
                        action = ODataCollection.actions.save_del;
                        totalNumMayChanged = true;
                        hasChanges = true;
                        jqAjax = deleteItem(option.baseUrl, dataItem);
                        break;
                    default:
                        throw "Not Supported Status";
                }
                index++;
                if (jqAjax) {
                    if (firstStartChange) {
                        if (option.onAsyncActionBegin) {
                            option.onAsyncActionBegin("SAVE");
                        }
                        if (option.onBeginSaving) {
                            option.onBeginSaving();
                        }
                        firstStartChange = false;
                    }
                    jqAjax.fail(function (jqXHR, textStatus, errorThrown) {
                        hasError = true;
                    });
                    jqAjax.done(function () {
                        if (crud.modelStatus(dataItem) === crud.modelStatusConsts.Deleted) {
                            //crud.modelStatus(dataItem, delTag, true);
                            dataItem.delTag = delTag;
                        } else {
                            crud.modelStatus(dataItem, crud.modelStatusConsts.Normal);
                        }
                    });
                    jqAjax.always(function (data, textStatus, jqXHR) {
                        if (!validateResponse(action, data, textStatus, jqXHR)) {
                            finishCallback();
                            return;
                        }
                        save(index, finishCallback);
                    });
                } else {
                    save(index, finishCallback);
                }
            }


            save(itemIndex, function () {
                if (option.onEndSaving) {
                    option.onEndSaving(hasError, hasChanges);
                }
                if (option.onAsyncActionEnd) {
                    option.onAsyncActionEnd("SAVE");
                }

                if (totalNumMayChanged) {
                    self.updatePagesCount(function () {
                        self.fetchDataOfPage(self.currentPageIndex(), function () {
                            if (saveFinishedCallback) {
                                saveFinishedCallback();
                            }
                        });
                    });
                } else {
                    if (saveFinishedCallback) {
                        saveFinishedCallback();
                    }
                }
            });
        };

        self.doFetch = function (fetchUrl) {
            var method = 'GET';
            if (option.fetchHttpMethod.toLocaleLowerCase() === "post") {
                method = "POST";
            }
            var ajaxOpt = {
                url: fetchUrl,
                type: method
            };
            if (typeof (option.cacheForAjax) !== "undefined") {
                ajaxOpt.cache = option.cacheForAjax;
            }
            else if (typeof (ODataCollection.cacheForAjax) !== "undefined") {
                ajaxOpt.cache = ODataCollection.cacheForAjax;
            }
            if (option.httpHeaders) {
                ajaxOpt.headers = option.httpHeaders;
            }
            return $.ajax(ajaxOpt);
        };

        self.refineFetchUrl = function(baseFetchUrl) {
            if (self.filter()) {
                baseFetchUrl = combineUrlWithParam(baseFetchUrl, "$filter=" + self.filter());
            }
            if (self.orderby()) {
                baseFetchUrl = combineUrlWithParam(baseFetchUrl, "$orderby=" + self.orderby());
            }
            return baseFetchUrl;
        };

        //the fetchUrl can be ignore
        //if provide fetchUrl, then use
        //then self.baseUrl+self.filter
        //forceUpdatePagesCount default is false
        self.fetchDataOfPage = function (fetchUrl, pageIndex, fetchFinishedCallback, forceUpdatePagesCount) {
            if (typeof (fetchUrl) === "number") {
                forceUpdatePagesCount = fetchFinishedCallback;
                fetchFinishedCallback = pageIndex;
                pageIndex = fetchUrl;
                fetchUrl = undefined;
            } else if (typeof (fetchUrl) === "function") {
                forceUpdatePagesCount = pageIndex;
                fetchFinishedCallback = fetchUrl;
                pageIndex = 0;
                fetchUrl = undefined;
            }

            if (!fetchUrl) {
                fetchUrl = self.refineFetchUrl(self.baseUrl());
            }

            if (typeof (forceUpdatePagesCount) === "undefined") {
                forceUpdatePagesCount = false;
            }
            if (forceUpdatePagesCount) {
                var totalCountUrl = fetchUrl;
                if (totalCountUrl) {
                    totalCountUrl = combineUrlWithParam(totalCountUrl, "$inlinecount=allpages");
                }
                return self.updatePagesCount(totalCountUrl, function (success, pagesCount) {
                    if (success) {
                        self.fetchDataOfPage(fetchUrl, pageIndex, fetchFinishedCallback, false);
                    }
                });
            }

            if (option.onAsyncActionBegin) {
                option.onAsyncActionBegin("FETCH");
            }
            if (option.onBeginFetch) {
                option.onBeginFetch();
            }

            function finalNoAsyncProcess() {
                if (fetchFinishedCallback) {
                    fetchFinishedCallback();
                }
                if (option.onAsyncActionEnd) {
                    option.onAsyncActionEnd("FETCH");
                }
            }

            function finalPrcoess(success, originalFetchedItems) {
                if (originalFetchedItems) {
                    for (var i = 0; i < originalFetchedItems.length; i++) {
                        parseDateProps(originalFetchedItems[i], option.dateProperties);
                    }
                }

                if (option.onEndFetchPreProcessItems) {
                    option.onEndFetchPreProcessItems(success, self, originalFetchedItems, function (processedItems) {
                        if (!$.isArray(processedItems) && typeof (processedItems) != "undefined") {
                            throw "processedItems should be array or undefined";
                        }
                        if (!processedItems) {
                            processedItems = originalFetchedItems;
                        }
                        updateObservableArrayOfKOVMWithJsonObj(self.items, processedItems);
                        finalNoAsyncProcess();
                    });
                } else {
                    updateObservableArrayOfKOVMWithJsonObj(self.items, originalFetchedItems);
                    finalNoAsyncProcess();
                }
            }

            if (typeof (pageIndex) === "undefined") {
                pageIndex = self.currentPageIndex();
            }

            if (self.itemsCountOnePage() > 0 && pageIndex >= self.pagesCount()) {
                finalPrcoess(true, []);
                return undefined;
            }
            self.currentPageIndex(pageIndex);
            var url = fetchUrl;
            //only when self.itemsCountOnePage()>0, then we do page
            if (self.itemsCountOnePage() > 0) {
                url = combineUrlWithParam(url, "$skip=" + (self.currentPageIndex() < 0 ? 0 : self.currentPageIndex() * self.itemsCountOnePage()));
                url = combineUrlWithParam(url, "$top=" + self.itemsCountOnePage());
            }

            return self.doFetch(url).always(function (data, textStatus, jqXHR) {
                if (validateResponse(ODataCollection.actions.fetch, data, textStatus, jqXHR) && textStatus === "success") {
                    var actualData = data.value;
                    if (option.fetchGetValueFunc) {
                        actualData = option.fetchGetValueFunc(data, textStatus, jqXHR);
                    }
                    finalPrcoess(true, actualData);
                } else {
                    finalPrcoess(false, []);
                }
            });
        };

        self.doUpdatePagesCount = function (updatePagesCountUrl) {
            var method = 'GET';
            if (option.getTotalCountMethod && option.getTotalCountMethod.toLocaleLowerCase() == "post") {
                method = "POST";
            }
            var ajaxOpt = {
                url: updatePagesCountUrl,
                type: method
            };
            if (option.httpHeaders) {
                ajaxOpt.headers = option.httpHeaders;
            }
            return $.ajax(ajaxOpt);
        };

        //the totalCountUrl can be ignore
        //if provide totalCountUrl, then use
        //then if option.getTotalCountUrl then use
        //then use self.baseUrl + self.filter to create new one based on odata protcol
        //the updatePageCountfinishedCallback: function(bool, newTotalPagesCount), first is indicate if successfully or not, second is the new got total pages count
        self.updatePagesCount = function (totalCountUrl, updatePageCountfinishedCallback) {
            if (typeof (totalCountUrl) === "function") {
                updatePageCountfinishedCallback = totalCountUrl;
                totalCountUrl = undefined;
            }
            if (!totalCountUrl) {
                if (option.getTotalCountUrl) {
                    totalCountUrl = option.getTotalCountUrl(option.baseUrl);
                } else {
                    totalCountUrl = self.refineFetchUrl(self.baseUrl());

                    totalCountUrl = combineUrlWithParam(totalCountUrl, "$inlinecount=allpages");
                }
            }
            if (option.onAsyncActionBegin) {
                option.onAsyncActionBegin("UPADTEPAGESCOUNT");
            }

            return self.doUpdatePagesCount(totalCountUrl).done(function (data, textStatus, jqXHR) {
                var count;
                if (option.parseTotalCount) {
                    count = option.parseTotalCount(data);
                } else if (typeof (data["odata.count"]) !== "undefined") {
                    count = data["odata.count"];
                } else {
                    count = data.value;
                }
                count = parseInt(count);
                self.totalCount(count);
                if (self.currentPageIndex() >= self.pagesCount()) {
                    self.currentPageIndex(self.pagesCount() - 1);
                }
            }).always(function (data, textStatus, jqXHR) {
                var success = (validateResponse(ODataCollection.actions.fetchPageCount, data, textStatus, jqXHR) && textStatus == "success" && typeof (data.value) !== "undefined");
                if (!success) {
                    self.totalCount(0);
                }
                if (updatePageCountfinishedCallback) {
                    updatePageCountfinishedCallback(success, self.pagesCount());
                }
                if (option.onAsyncActionEnd) {
                    option.onAsyncActionEnd("UPADTEPAGESCOUNT");
                }
            });
        };
    }

    return new _oDataCollection();
};

ODataCollection.isODataCollection = function (obj) {
    if (typeof (obj) === "undefined") {
        return false;
    }
    if (obj === null) {
        return false;
    }
    return obj["TYPE"] && (typeof (obj["TYPE"]) === "function") && (obj["TYPE"]() === "_oDataCollection");
};

ODataCollection.dataItemToPlainObject = function (dataItem) {
    if (typeof (dataItem) === "string") {
        return dataItem;
    }
    var obj = {};
    for (var p in dataItem) {
        var unwrapProp = ko.utils.unwrapObservable(dataItem[p]);
        if (ODataCollection.isODataCollection(unwrapProp)) {
            unwrapProp = unwrapProp.items();
        }
        obj[p] = unwrapProp;
    }
    return obj;
};

//dataItem must be the plain object
//this function convert each property of dataItme that is Date to ISO string, so that it can be parsed by web api 
ODataCollection.refinePropForoData = function (dataItem) {
    for (var prop in dataItem) {
        var value = dataItem[prop];
        switch (typeof (value)) {
            case "object":
                if ($.isArray(value)) {
                    for (var i = 0; i < value.length; i++) {
                        value[i] = ODataCollection.refinePropForoData(value[i]);
                    }
                } else if (value instanceof Date) {
                    value = value.toLocalISOString();
                } else {
                    value = ODataCollection.refinePropForoData(value);
                }
                break;
            default:
        }
        dataItem[prop] = value;
    }
    return dataItem;
};

//httpMethod: Get, Post
ODataCollection.invokeWebApi = function (httpMethod, url, dataItem, completeCallback, contentType, dataType, httpHeaders) {
    if (typeof (dataItem) !== "undefined") {
        dataItem = ODataCollection.refinePropForoData(ODataCollection.dataItemToPlainObject(dataItem));
    }
    var opt = {
        type: httpMethod,
        data: dataItem,
        url: url,
        complete: function (jqXHR, textStatus) {
            if (ODataCollection.validateHttpResponse && ODataCollection.validateHttpResponse(ODataCollection.actions.api, undefined, textStatus, jqXHR)) {
                textStatus = "error";
            }
            if (completeCallback) completeCallback(jqXHR, textStatus);
        }
    };
    if (httpHeaders) {
        opt.headers = httpHeaders;
    }
    if (contentType) {
        opt["contentType"] = contentType;
    }
    if (dataType) {
        opt["dataType"] = dataType;
    }
    return $.ajax(opt);
};

ODataCollection.invokeWebApiJson = function (httpMethod, url, dataItem, completeCallback, httpHeaders) {
    return ODataCollection.invokeWebApi(httpMethod, url, ko.toJSON(dataItem), completeCallback, "application/json", "json", httpHeaders);
};

ODataCollection.defaultItemsCountOnePage = 20;

//this function will read the date value in current timezone, and then return a string of these year, month, day,..., without speicfy the time zone
//this becasue the Date.toISOString will always convert the date to UTC time and append a z, but asp.net won't read z, and convert it to local time directly
//so this cause the time change
function toLocalISOString(date) {
    if (!(date instanceof Date)) {
        throw "Please call on Date object";
    }
    function twoDigit(number) {
        if (number >= 10) {
            return number;
        }
        return "0" + number.toString();
    }

    function threeDigit(number) {
        if (number >= 100) {
            return number;
        }
        if (number >= 10) {
            return "0" + number.toString();
        }
        return "00" + number.toString();
    }

    var str = date.getFullYear() + "-" + twoDigit(date.getMonth() + 1) + "-" + twoDigit(date.getDate()) +
        "T" + twoDigit(date.getHours()) + ":" + twoDigit(date.getMinutes()) + ":" + twoDigit(date.getSeconds());
    if (date.getMilliseconds() > 0) {
        str = str + "." + threeDigit(date.getMilliseconds());
    }
    return str;
}

function toUTCISOString(date) {
    if (!(date instanceof Date)) {
        throw "Please call on Date object";
    }
    return data.toISOString();
}

Date.prototype.toLocalISOString = function () {
    return toLocalISOString(this);
};
Date.prototype.toUTCISOString = function () {
    return toUTCISOString(this);
};

var oDataModelResource = {
    AddError: 'Add item error:',
    ChangeError: 'Change item error:',
    DeleteError: 'Delete item error:'
};