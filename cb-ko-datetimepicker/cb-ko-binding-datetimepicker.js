/*{
option: the option of datetimepicker, it is almost same as the option of datetimepicker (check the section Options on https://github.com/smalot/bootstrap-datetimepicker),
    please NOTE: there is two diferent:
    1. the format is a .net datetime format string, not same as the format of original definitation
    2. autoclose is true for default which is false originally

datetime: Date type, is the value that bound to this component
allowEmpty: default is false, means if allow input is empty or not
}*/
/*
useage:
1.
    Bootstrap <3.0
        <input size="16" type="text" value="2012-06-15 14:45" readonly data-bind="datetimepicker:{datetime: ****}">
    Bootstrap >=3.0
        <input size="16" type="text" value="2012-06-15 14:45" readonly class="form-control" data-bind="datetimepicker:{datetime: ****}">
2.
    Bootstrap < 3.0
        <div class="input-append date">
            <input size="16" type="text">
            <span class="add-on"><i class="icon-th OTHER-ICON-CLASS"></i></span>
        </div>
    Bootstrap >= 3.0
        <div class="input-group date">
            <input size="16" type="text">
            <span class="input-group-addon"><i class="glyphicon-th OTHER-ICON-CLASS"></i></span>
        </div>

*/
(function () {
    var _ = {
        UO: ko.utils.unwrapObservable,
        editorData: function (element) {
            element = $(element);
            var data = element.data('ko.bindingHandlers.datetimepicker.attachData');
            if (!data) {
                data = {};
                element.data('ko.bindingHandlers.datetimepicker.attachData', data);
            }
            return data;
        },
        updatePickerStatus: function (element, status) {
            var data = _.editorData(element);
            data.isShown = status;
        },
        isPickerShown: function (element) {
            return _.editorData(element).isShown;
        },
        bootstrapVersion: function () {
            if (typeof (ko.bindingHandlers.datetimepicker.bootstrapVersion) === "undefined") {
                return 3;
            }
            return ko.bindingHandlers.datetimepicker.bootstrapVersion;
        }
    };

    $(document).ready(function () {
        if ($(document).find(".row-fluid, .span1, .span2, .span3, .span4, .span5, .span6, .span7, .span8, .span9, .span10, .span11, .span12").length > 0) {
            ko.bindingHandlers.datetimepicker.bootstrapVersion = 2;
        }
    });


    //as datetimepicker always take the user input value as a UTC date, so we have to convert it to as user input a local timezone value
    function resolveDateTimePickerDateTime(datetime) {
        if (!datetime) {
            return datetime;
        }
        var asLocalTime = new Date();
        asLocalTime.setFullYear(datetime.getUTCFullYear(), datetime.getUTCMonth(), datetime.getUTCDate());
        asLocalTime.setHours(datetime.getUTCHours(), datetime.getUTCMinutes(), datetime.getUTCSeconds(), datetime.getUTCMilliseconds());
        return asLocalTime;
    }

    function updateObservable(valueAccessor, newDate) {
        if (ko.isObservable(valueAccessor().datetime)) {
            valueAccessor().datetime(newDate);
        } else {
            valueAccessor().datetime = newDate;
        }
    }

    var DT = ko.bindingHandlers.datetimepicker = {
        elementMarkClass: "ko-bindingHandlers-datetimepicker-element",
        triggerBlurForKODatetimePickerUpdate: "triggerBlurForKODatetimePickerUpdate",

        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            element = $(element);
            //check if the required class added
            if (element.is('input')) {
                if (_.bootstrapVersion() <= 2) {

                } else {
                    if (!element.is(".form-control")) {
                        alert("ko.bindingHandlers.datetimepicker error: the target element of ko.bindingHandlers.datetimepicker should have .form-control class");
                    }
                }
            } else {
                if (!element.is(".date")) {
                    alert("ko.bindingHandlers.datetimepicker error: the target element of ko.bindingHandlers.datetimepicker should have .date class");
                }
                if (_.bootstrapVersion() <= 2) {
                    if (!element.is(".input-append") && !element.is(".input-prepend")) {
                        alert("ko.bindingHandlers.datetimepicker error: the target element of ko.bindingHandlers.datetimepicker should have .input-append or input-prepend class");
                    }

                    var addon = element.find(".add-on");
                    if (addon.length > 0) {
                        if (addon.children(".icon-th, .icon-time, .icon-calendar").length <= 0) {
                            alert("ko.bindingHandlers.datetimepicker error: .add-on's children should have class .icon-th or .icon-time or .icon-calendar");
                        }
                    }
                } else {
                    if (!element.is(".input-group")) {
                        alert("ko.bindingHandlers.datetimepicker error: the target element of ko.bindingHandlers.datetimepicker should have .input-group class");
                    }

                    var addon = element.find(".input-group-addon");
                    if (addon.length > 0) {
                        if (addon.children(".glyphicon-th, .glyphicon-time, .glyphicon-calendar").length <= 0) {
                            alert("ko.bindingHandlers.datetimepicker error: .input-group-addon's children should have class .glyphicon-th or .glyphicon-time or .glyphicon-calendar");
                        }
                    }
                }
            }
            var option = {};
            if (element.has("[data-date-format]")) {
                option.format = element.attr("data-date-format");
            }
            option = $.extend({}, DT.defaultOption, option, _.UO(valueAccessor().option));
            if (option.format) {
                option.format = DT.convertDotNetFormatToOriginalOption(_.UO(option.format));
            }
            for (var p in option) {
                option[p] = _.UO(option[p]);
            }
            if (!("autoclose" in option)) {
                option["autoclose"] = true;
            }

            function onDateTimePickerChangeDate(newDatetimePickerDate) {
                //as datetimepicker always take the user input value as a UTC date, so we have to convert it to as user input a local timezone value
                var asLocalTime = resolveDateTimePickerDateTime(newDatetimePickerDate);
                updateObservable(valueAccessor, asLocalTime);
            }

            element.addClass(DT.elementMarkClass);
            element.datetimepicker(option).on("changeDate", function (ev) {
                onDateTimePickerChangeDate(ev.date);
            });

            function allowEmptionOption() {
                if (typeof (valueAccessor().allowEmpty) !== "undefined") {
                    return ko.utils.unwrapObservable(valueAccessor().allowEmpty);
                }
                return false;
            }

            var input = undefined;
            if (!element.is('input')) {
                input = element.find("input");
            } else {
                input = element;
            }
            if (input) {
                if (input.length > 0) {
                    input = $(input[0]);
                    input.keyup(function () {
                        //datetimepicker library has a bug, that is: when use it with the component (ie, div + input), it doesn't update when user manually changes the input
                        if (!element.is('input')) {
                            var datetimepickerObj = element.data("datetimepicker");
                            var DPGlobal = $.fn.datetimepicker.DPGlobal;
                            if (input.val()) { //if input is not empty, if input is empty then we just keep the datetimepicker calander dispaly date unchanged
                                //fix the datetimepicker bug, which always use the cached datetime to update the calcander when user manually update the input (in the component way)
                                element.data("date", DPGlobal.parseDate(input.val(), datetimepickerObj.format, datetimepickerObj.language, datetimepickerObj.formatType));
                            }
                            datetimepickerObj.update();
                        }
                    });
                    //fix the datetimepicker bug, when user just manually update input, the datetimepicker doesn't trigger the changeDate event
                    //so the bounded observable is not updated
                    //so we always update the observable when the input lost focus
                    input.blur(function () {
                        var datetimepickerObj = element.data("datetimepicker");
                        var d = datetimepickerObj.date;
                        if ((!input.val()) && allowEmptionOption()) {
                            //datetimepickerObj.date = undefined;
                            d = undefined;
                        }
                        if ((datetimepickerObj.picker).css('display') == 'none') {
                            onDateTimePickerChangeDate(d);
                        }
                    });
                }
            }
        },
        update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            $(element).datetimepicker("update", _.UO(valueAccessor().datetime));
        },

        //this function convert the .net datetime string to original format, the library smalot/bootstrap-datetimepicker use a different format of datetime comparing with .net datetime
        convertDotNetFormatToOriginalOption: function (format) {
            var regex = /([^d]|^)d{3}([^d]|$)/;
            if (regex.test(format)) {
                throw "Not support ddd";
            }
            regex = /([^d]|^)d{4}([^d]|$)/;
            if (regex.test(format)) {
                throw "Not support dddd";
            }
            regex = /(f|F|g|K|z)+/;
            if (regex.test(format)) {
                throw "Not support any f, F, g, K or z";
            }
            regex = /([^t]|^)t([^t]|$)/;
            if (regex.test(format)) {
                throw "Not support any t";
            }
            regex = /(([^y]|^)y([^y]|$))|(([^y]|^)y{3}([^y]|$))|(y{5,})/;
            if (regex.test(format)) {
                throw "Not support y, yyy or yyyyy";
            }

            //change h -> H
            //H -> h
            //m -> i
            //MMMM -> MM, MMM -> M, MM -> mm, M -> m
            format = format.replace(/h/g, "~").replace(/H/g, "h").replace(/~/g, "H").replace(/m/g, "i").
                replace(/M{4}/g, "~~~~").replace(/M{3}/g, "```").replace(/M{2}/g, "mm").replace(/M/g, "m").replace(/~{4}/g, "MM").replace(/~{3}/g, "M").
                replace(/t{2}/g, "P");

            return format;
        }
    };


    $(document).ready(function () {
        if (typeof (tableInlineEditFinishHandler) !== "undefined") {
            tableInlineEditFinishHandler.registerHandler("." + DT.elementMarkClass, function ($currentCell, $editor, $endEdit) {
                var input = undefined;
                if (!$editor.is('input')) {
                    input = $editor.find("input");
                } else {
                    input = $editor;
                }

                var data = _.editorData($editor);
                if (!data.blurHandler) {
                    data.blurHandler = function (event, triggerReason) {
                        if (triggerReason === ko.bindingHandlers.tableCRUD.triggerBlurForKOUpdate ||
                            triggerReason === ko.bindingHandlers.datetimepicker.triggerBlurForKODatetimePickerUpdate) {
                            return;
                        }
                        //in some case, the blur of input is triggered before the picker show event, this will case the picker can't be shown
                        //so we wait for 100 ms then check
                        setTimeout(function () {
                            if (!_.isPickerShown($editor)) {
                                input.trigger("blur", ko.bindingHandlers.datetimepicker.triggerBlurForKODatetimePickerUpdate);
                                $endEdit();
                            }
                        }, 100);
                    };
                    //we bind this handler only for the case that if the picker is not set to be popuped automaticlly
                    $editor.blur(data.blurHandler);
                }

                $editor.on("show", function (ev) {
                    _.updatePickerStatus($editor, true);
                    $editor.off('blur', data.blurHandler);
                }).on("hide", function (ev) {
                    _.updatePickerStatus($editor, false);
                    //we force trigger this event so that the input blur handler can be triggered, that handeler is 
                    //to fix the datetimepicker bug, when user just manually update input, the datetimepicker doesn't trigger the changeDate event
                    input.trigger("blur", ko.bindingHandlers.datetimepicker.triggerBlurForKODatetimePickerUpdate);
                    $editor.off('blur', data.blurHandler);
                    $editor.on('blur', data.blurHandler);
                    $endEdit();
                });
            });
        }
    });
})();