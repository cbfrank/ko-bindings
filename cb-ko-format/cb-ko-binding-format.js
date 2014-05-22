/*
bind:
format:{
    formatStr: the format string that will be used when convert the value to string or parse value from string
    value: the viewModel property that will be bound to the current control
    dataType(dateType): ko.bindingHandlers.format.dataTypes, the value type, if it is ko.bindingHandlers.format.dataTypes.func, then the property formatStr will be ignore,
             then it will use formatFunc and parseFunc to format the value to string or update the string to the value
             Important!!, the dateType is typo, although it is supported but use dataType in the future
    formatFunc/parseFunc: see dateType, the two are string expression, and the the ko binding context can be used, and there is also $value/$valueTxt for formatFunc/parseFunc
                         $value is the value to be formatted, and $valueTxt is the text of the value to be parsed
}
*/
(function () {
    var _ = {
        UO: ko.utils.unwrapObservable,
        IOB: ko.isObservable
    };

    _.FT = ko.bindingHandlers.format = {
        getDecimalLength: function (number) {
            if (!$.isNumeric(number)) {
                return undefined;
            }
            //is int
            if (parseFloat(number) == parseInt(number, 10) && !isNaN(number)) return 0;
            var strNumber = number.toString();
            var pointIndex = strNumber.indexOf(".");
            if (pointIndex >= 0) {
                return strNumber.length - pointIndex - 1;
            }
            //var length = 0;
            //while (number % 1 != 0) {
            //    length++;
            //    number = number * 10;
            //    if (length > 15) {
            //        throw "there are too many decimals in the number";
            //    }
            //}
            //return length;
            return undefined;
        },

        getFunctionExpressionValue: function (functionExpression, bindingContext, element, defaultValue, constantName, constantValue) {
            element = $(element);
            functionExpression = _.UO(functionExpression);
            if (functionExpression) {
                var func;
                if (element[0][functionExpression]) {
                    func = element[0][functionExpression];
                } else {
                    var funcBody = "with ($bindingContext) with($bindingContext['$data']){{ return " + functionExpression + ";}}";
                    element[0][functionExpression] = func = new Function("$bindingContext", constantName, funcBody);
                }

                return func(bindingContext, constantValue);
            } else {
                return defaultValue;
            }
        },

        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            element = $(element);
            var bindData = valueAccessor();
            element.change(function (event) {
                //the change event maybe triggered several times
                //only when it is triggerd by the current element directly, we process, for the event triggerd by bubble, we ignore it
                if (typeof (event.eventPhase) !== "undefined") {
                    if (event.eventPhase != 2) {
                        return;
                    }
                } else { //for IE8, event.eventPhase is undefined, so wo compare it with current element
                    if (event.currentTarget != element[0]) {
                        return;
                    }
                }

                var textToBeParsed = element.val();

                var parsedValue;
                var uoDataType = bindData.dataType;
                if (!uoDataType) {
                    uoDataType = bindData.dateType; //dateType is a typo, it should be dataType, but we have to support it for existing code that use it.
                }
                uoDataType = _.UO(uoDataType);
                if (uoDataType === _.FT.dataTypes.func) {
                    parsedValue = _.FT.getFunctionExpressionValue(bindData.parseFunc, bindingContext, element, textToBeParsed, "$valueTxt", textToBeParsed);
                } else {
                    var format;
                    if (bindData.formatStr) {
                        format = $.trim(_.UO(bindData.formatStr));
                    } else {
                        switch (uoDataType) {
                            case _.FT.dataTypes.number:
                                if (defaultFormatSetting.numberFormat) {
                                    format = defaultFormatSetting.numberFormat;
                                } else {
                                    format = "n";
                                }
                                break;
                            case _.FT.dataTypes.dateTime:
                                if (defaultFormatSetting.dateTimeFormat) {
                                    format = defaultFormatSetting.dateTimeFormat;
                                } else {
                                    format = "yyyy/MM/dd HH:mm:ss";
                                }
                                break;
                            default:
                                throw "Not supported data type";
                        }
                    }

                    if (textToBeParsed !== null && typeof (textToBeParsed) !== "undefined" && textToBeParsed !== "") {
                        switch (uoDataType) {
                            case _.FT.dataTypes.number:
                                parsedValue = Globalize.parseFloat(textToBeParsed);
                                break;
                            case _.FT.dataTypes.dateTime:
                                parsedValue = Globalize.parseDate(textToBeParsed, format);
                                break;
                            default:
                                throw "Not supported data type";
                        }
                    } else {
                        parsedValue = undefined;
                    }
                }


                if (_.IOB(bindData.value)) {
                    var v = _.UO(bindData.value);
                    if (v === parsedValue) {
                        return;
                    }
                    if ((v === null || typeof (v) === "undefined") && (parsedValue === null || typeof (parsedValue) === "undefined")) {
                        return;
                    }
                    bindData.value(parsedValue);
                } else {
                    throw 'value must be bound to an observable field';
                    //ko.$helper.writeValueToProperty(_.UO(bindData.value), allBindingsAccessor, 'value', parsedValue);
                }
            });
        },
        update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            element = $(element);
            var bindData = valueAccessor();
            var formatedValue = undefined;
            var value = _.UO(bindData.value);

            var uoDataType = bindData.dataType;
            if (!uoDataType) {
                uoDataType = bindData.dateType; //dateType is a typo, it should be dataType, but we have to support it for existing code that use it.
            }
            uoDataType = _.UO(uoDataType);
            if (uoDataType === _.FT.dataTypes.func) {
                formatedValue = _.FT.getFunctionExpressionValue(bindData.formatFunc, bindingContext, element, undefined, "$value", value);
            } else {
                var format;
                if (bindData.formatStr) {
                    format = $.trim(_.UO(bindData.formatStr));
                } else {
                    switch (_.UO(bindData.dateType)) {
                        case _.FT.dataTypes.number:
                            if (defaultFormatSetting.numberFormat) {
                                format = defaultFormatSetting.numberFormat;
                            } else {
                                format = "n" + _.FT.getDecimalLength(_.UO(bindData.value));
                            }
                            break;
                        case _.FT.dataTypes.dateTime:
                            if (defaultFormatSetting.dateTimeFormat) {
                                format = defaultFormatSetting.dateTimeFormat;
                            } else {
                                format = "yyyy/MM/dd HH:mm:ss";
                            }
                            break;
                        default:
                            throw "Not supported data type";
                    }
                }

                if (value === null || typeof (value) === "undefined") {
                    formatedValue = undefined;
                } else {
                    formatedValue = Globalize.format(_.UO(bindData.value), format);
                }
            }


            if (element.prop("tagName") === "INPUT" || element.prop("tagName") === "SELECT") {
                if (element.val != formatedValue) {
                    element.val(formatedValue);
                }
            } else {
                if (formatedValue === null || typeof (formatedValue) === "undefined") {
                    if (element.text() == "" || element.text() == null || typeof (element.text()) === "undefined") {

                    } else {
                        element.text("");
                    }
                    //hack for IE8
                    //on IE8, table inlie edit mode, when we set the ediotr to empty content,
                    //the cell doesn't updated although the potential data is updated
                    //It seesm because there will aditional change tirgger that cause the logic doesn't work
                    //so for IE8, we finally empty the cell, but empty cell on IE8 won't trigger the blur event of the children of the cell
                    //but inline edit depends on this event
                    //so manually trigger this evnet
                    if (ko.$helper && ko.$helper.browser && ko.$helper.browser.isIE && ko.$helper.browser.version <= 8) {
                        if (element.children().length > 0) {
                            element.children().blur();
                        }
                        element.empty();
                    }
                } else {
                    if (element.text() != formatedValue) {
                        element.text(formatedValue);
                    }
                }
            }
        },
        dataTypes: {
            number: "NUMBER",
            dateTime: "DATETIME",
            func: "FUNCTION"
        }
    };
})();

var defaultFormatSetting = {

};