function jsonObjectToKoViewModel(json, replaceWithObservableOnSameObject) {
    var obj = {};
    if (typeof (replaceWithObservableOnSameObject) === "undefined") {
        replaceWithObservableOnSameObject = false;
    }
    if (replaceWithObservableOnSameObject) {
        obj = json;
    }
    for (var p in json) {
        if (ko.isObservable(json[p])) {
            obj[p] = json[p];
        } else {
            if ($.isArray(json[p])) {
                obj[p] = ko.observableArray(json[p]);
            }
            else if (typeof (json[p]) === "function") {
                obj[p] = json[p];
            }
            else {
                obj[p] = ko.observable(json[p]);
            }
        }
    }
    return obj;
}

var tableCreater = {};
(function () {
    //helper method
    var _ = tableCreater._ = {
        UO: ko.utils.unwrapObservable,
        IOB: ko.isObservable,

        //get the attach data of table element
        data: function (element) {
            if ($(element).prop("tagName") !== "TABLE") {
                throw "Should be table";
            }
            var tableAttachData = $(element).data("tableAttachData");
            if (!tableAttachData) {
                tableAttachData = {};
                $(element).data('tableAttachData', tableAttachData);
            }
            return tableAttachData;
        },

        //get the attach data of row (tr) element
        rowAttachData: function (tr) {
            if ($(tr).prop("tagName") !== "TR") {
                throw "Should be tr";
            }
            var rowAttachData = $(tr).data("rowAttachData");
            if (!rowAttachData) {
                rowAttachData = $(tr)[0]["ko-binding-table-customr-rowAttachData"];
                if (rowAttachData) {
                    $(tr).data('rowAttachData', rowAttachData);
                }
            }
            if (!rowAttachData) {
                rowAttachData = {};
                $(tr).data('rowAttachData', rowAttachData);
                $(tr)[0]["ko-binding-table-customr-rowAttachData"] = rowAttachData;
            }
            return rowAttachData;
        },

        cellAttachData: function (td) {
            if ($(td).prop("tagName") !== "TD") {
                throw "Should be td";
            }
            var cellAttachData = $(td).data("cellAttachData");
            if (!cellAttachData) {
                cellAttachData = $(td)[0]["ko-binding-table-customr-cellAttachData"];
                if (cellAttachData) {
                    $(td).data('cellAttachData', cellAttachData);
                }
            }
            if (!cellAttachData) {
                cellAttachData = {};
                $(td).data('cellAttachData', cellAttachData);
                $(td)[0]["ko-binding-table-customr-cellAttachData"] = cellAttachData;
            }
            return cellAttachData;
        },

        CRUDAttachData: function (element) {
            var attachData = $(element).data("CRUDAttachData");
            if (!attachData) {
                attachData = {};
                $(element).data('CRUDAttachData', attachData);
            }
            return attachData;
        },

        //this function return all crud bindings attach data (array) that the target table is this table
        getRelatedCRUDAttachData: function (table) {
            if ($(table).prop("tagName") !== "TABLE") {
                throw "Should be table";
            }
            var d = _.data(table);
            if (typeof (d.relatedCRUDDatas) === "undefined") {
                d.relatedCRUDDatas = [];
            }
            return d.relatedCRUDDatas;
        },

        updateCrudTargetTable: function (attachData, newTargetTable) {
            if (attachData.targetTable === newTargetTable) {
                var d = _.getRelatedCRUDAttachData(newTargetTable);
                if ($.inArray(attachData, d) < 0) {
                    d.push(attachData);
                }
                return;
            }
            if (typeof (attachData.targetTable) !== "undefined") {
                var old = _.getRelatedCRUDAttachData(attachData.targetTable);
                var oldIndex = $.inArray(attachData, old);
                if (oldIndex < 0) {
                    throw "Logic Error, can't find attachdata in the target table";
                }
                old.splice(oldIndex);
            }
            var newA = _.getRelatedCRUDAttachData(newTargetTable);
            var newIndex = $.inArray(attachData, newA);
            if (newIndex >= 0) {
                throw "Logic Error, attachdata already in the target table";
            }
            newA.push(attachData);
            attachData.targetTable = newTargetTable;

            _.TCRUD.makeSureAttachDataConsist(newA);
            if (newA.length > 1) {
                throw "one table can only have one related crud";
            }
        },

        pagingAttachData: function (element) {
            var attachData = $(element).data("pagingAttachData");
            if (!attachData) {
                attachData = {};
                $(element).data('pagingAttachData', attachData);
            }
            return attachData;
        },

        //only use it in keypress event
        isCharacterKeyPress: function (keyEvent) {
            if (keyEvent.char === "") {
                return false;
            }
            if (typeof keyEvent.which === "undefined") {
                // This is IE, which only fires keypress events for printable keys
                return true;
            } else if (typeof keyEvent.which === "number" && keyEvent.which > 0) {
                // In other browsers except old versions of WebKit, evt.which is
                // only greater than zero if the keypress is a printable key.
                // We need to filter out backspace and ctrl/alt/meta key combinations
                return !keyEvent.ctrlKey && !keyEvent.metaKey && !keyEvent.altKey && keyEvent.which !== 8 && keyEvent.which !== 13 && keyEvent.which !== 27 && keyEvent.which !== 9 &&
                    !(keyEvent.keyCode >= 37 && keyEvent.keyCode <= 40); //not arrow key;
            }
            return false;
        },

        dataEX: function (element, key, value) {
            element = $(element);
            key = "internal-data-" + key;
            if (typeof (value) === "undefined") {
                if (element.length <= 0) {
                    return undefined;
                }
                return element[0]["internal-data-" + key];
            } else {
                if (element.length > 0) {
                    element[0]["internal-data-" + key] = value;
                }
            }
        },

        removeDataEx: function (element, key) {
            element = $(element);
            key = "internal-data-" + key;
            if (element.length > 0) {
                element[0]["internal-data-" + key] = undefined;
                delete element[0]["internal-data-" + key];
            }
        },

        nextCell: function (theCell, rowShift, colShift, auto) {
            theCell = $($(theCell)[0]);
            var theRow = $(theCell.parent("tr")[0]);

            if (typeof (rowShift) === "undefined") {
                rowShift = 0;
            }
            var rindex = theRow.parent().children().index(theRow) + rowShift + 1;

            if (typeof (colShift) === "undefined") {
                colShift = 0;
            }
            var cindex = theCell[0].cellIndex + colShift + 1;

            theCell = $(theRow.parent()[0]).children("tr:nth-child(" + rindex + ")").children("td:nth-child(" + cindex + ")");

            if (theCell.length <= 0 && auto) {
                if (auto) {
                    if (colShift > 0) {
                        //next row first child
                        theCell = $(theRow.parent()[0]).children("tr:nth-child(" + (rindex + 1) + ")").children("td:first-child");
                    } else {
                        //previous row last child
                        theCell = $(theRow.parent()[0]).children("tr:nth-child(" + (rindex - 1) + ")").children("td:last-child");
                    }
                }
            }
            if (theCell.length <= 0) {
                return undefined;
            }
            return theCell;
        }
    };

    _.CellMouseManager = {
        updateSelectFocus: function (event, selectMode, allMulti, table, theCell) {
            table = $(table);
            theCell = $(theCell);
            var theRow = theCell.parent("tr");

            if (!event || !event.ctrlKey || !_.UO(allMulti)) {
                _.TB.clearAllRowsSelection(table, false, theRow);
                _.TB.clearAllCellsSelection(table, theCell);
            }
            switch (_.UO(selectMode)) {
                case _.TB.selectMode.rowSelect:
                    {
                        //if only one row selected, then also focus it, if there is alreay row selected, then don't change the focus
                        _.TB.selectRow(theRow, true, undefined, true);
                    }
                    break;
                case _.TB.selectMode.cellSelect:
                    {
                        //if only one cell selected, then alos focus it, if there is alreay cell selected, then don't change the focus
                        _.TB.selectCell(theCell, true, true);
                    }
                    break;
                default:
                    throw "Not supported table selectMode";
            }
        },

        beginInlinEdit: function (table, theCell, editAction) {
            table = $(table);
            theCell = $(theCell);
            var cells = _.TB.getTableCells(table);
            cells.each(function (index, c) {
                if (!theCell.is(c)) {
                    _.CellMouseManager.endCellInlineEdit(c);
                }
            });
            _.CellMouseManager.beginCellInlineEdit(theCell, editAction);
        },

        endTableInlineEdit: function (table) {
            table = $(table);
            var cells = _.TB.getTableCells(table);
            cells.each(function (index, c) {
                _.CellMouseManager.endCellInlineEdit(c);
            });
        },

        beginCellInlineEdit: function (theCell, editAction) {
            theCell = $(theCell);

            //the editor data is
            //{
            //  currentEditDataItem: the dataitem that is bound to the editor
            //  copiedDateItem2:  additional copy of the original data item
            //  cell: the td cell that the editor for
            //  originalChildren: the original nodes in side the cell
            //  editAction: it is the value passed to editAction
            //               ko.bindingHandlers.tableCRUD.crudActionTypes.add/ko.bindingHandlers.tableCRUD.crudActionTypes.change/ko.bindingHandlers.tableCRUD.crudActionTypes['delete']
            //}
            //result is finally the cell is into the edit modal or not
            function beginInlineEdit(currentCell) {
                var table = $(theCell.parents("table")[0]);
                var attachData = _.getRelatedCRUDAttachData(table);
                //we have already make the attachData consist, so can just use the first one
                attachData = attachData[0];
                var bindingData = attachData.bindingData;

                var currentRow = currentCell.parent("tr");
                var dataItem = _.TB.rowDataItem(currentRow);
                var head = $(table).children("thead");
                var col = $(head.children("tr").first().children()[currentCell.index()]);

                if (!editAction) {
                    editAction = _.TCRUD.convertModelStatusToActionType(_.TCRUD.modelStatus(dataItem));
                    if (!editAction) {
                        editAction = _.TCRUD.crudActionTypes.change;
                    }
                }

                if (tableCreater.isColEditableShown(table, currentCell.index(), editAction) && !tableCreater.isColReadOnly(table, currentCell.index(), editAction)) {
                    var template = tableCreater.getCellEditorTemplate(col, editAction, table);
                    if (typeof (template) !== "undefined") {
                        var editor = $(tableCreater.createCRUDFieldEditor(template, editAction, tableCreater.isColReadOnly(table, currentCell.index(), editAction)));
                        editor.addClass(_.TCRUD.inlineEditorClassTag);
                        editor.attr("tabindex", currentCell.attr("tabindex") + 5);

                        currentCell.width(currentCell.width());
                        currentCell.addClass(tableCreater.inlineEditingCellClass);
                        var editorDiv = $("<div/>");
                        _.TCRUD.cellInlinEditorDiv(currentCell, editorDiv);
                        editorDiv.attr("tabindex", currentCell.attr("tabindex") + 1);
                        editorDiv.width(currentCell.innerWidth());
                        editorDiv.height(currentCell.innerHeight());
                        editorDiv.css("margin-left", (0 - tableHelper.convertToPixelValue(currentCell.css("padding-left"))) + "px");
                        editorDiv.css("margin-right", (0 - tableHelper.convertToPixelValue(currentCell.css("padding-right"))) + "px");
                        editorDiv.css("margin-top", (0 - tableHelper.convertToPixelValue(currentCell.css("padding-top"))) + "px");
                        editorDiv.css("margin-bottom", (0 - tableHelper.convertToPixelValue(currentCell.css("padding-bottom"))) + "px");
                        editor.width("100%");
                        editor.height("100%");

                        var copiedItem = _.TCRUD.copyEditItem(attachData, dataItem);
                        //we copy two copies, becasue there is a bug in inline mode
                        //when a input is being removed, it will trigger change event as undefined, don't know why
                        //and if there is a format binding
                        //then it will set the original item value to null
                        //so we create a copy 2, that will always unsed, and then will copy it back to recover original item value
                        var copiedItem2 = _.TCRUD.copyEditItem(attachData, dataItem);

                        var editorAttachData = {
                            currentEditDataItem: copiedItem,
                            copiedDateItem2: copiedItem2,
                            editAction: editAction
                        };
                        if (currentCell.children().length <= 0) {
                            editorAttachData.originalChildren = currentCell.text();
                            currentCell.text("");
                        } else {
                            editorAttachData.originalChildren = currentCell.children();
                            currentCell.children().hide();
                        }

                        _.dataEX(editor, _.TCRUD.editorAttachDataKey, editorAttachData);
                        //editor.data(_.TCRUD.editorAttachDataKey, editorAttachData);
                        //if (previousEditor.length > 1) {
                        //    //at a time, only one unremovd editor can have
                        //    //if multi, then the order of them is uncerten
                        //    //the copied2 way will have issues
                        //    throw "Not supported";
                        //}

                        editorDiv.append(editor);

                        ko.applyBindings(attachData.bindingContext.createChildContext(copiedItem), editor[0]);
                        //after the editor is append to the editorDiv, and ko binding is applied
                        //some new agent control may be created
                        //so in some case, the editorDiv.height is not enough
                        //so we make sure the editorDiv will auto extend in case it can't hold all content
                        //first we set it height to auto to make it as height as need, then check the new height to the old
                        //if the new height is bigger, then we keep it as auto, and set min-height of the cell height to avoid it becomes smaller in some case
                        //if the new height is samller, as we can't reduce the cell(row) height, so we set min-height of the cell height to make sure it always fill the cell
                        setTimeout(function () {
                            var cellHeight = editorDiv.height();
                            editorDiv.height("auto");
                            //if (editorDiv.height() <= cellHeight) {
                            //    editorDiv.height(cellHeight);
                            //} else {

                            //}
                            editorDiv.css("min-height", cellHeight);
                        }, 80);

                        if (bindingData.beforeShowEditor) {
                            _.UO(bindingData.beforeShowEditor).call(attachData.viewModel, editAction, editor, copiedItem);
                        }

                        currentCell.append(editorDiv);
                        //after div is append to cell, for some specialy editor (such as multi selector chosen control), a new, temp html element will be created and use the agent contrl, 
                        //their height may changes from time to time
                        //but the table cell won't know this, although we can set container height to auto, but in the case if editor smaller than the row height,
                        //there will be space between the container div and the cell, in this case, only the editor creator konw every thing
                        //so we let the creatro register a handler, and it will be called after the editor is append to the cell
                        var afterAppendHandler = tableInlineEditAfterEditorAppendInHtmlHandler.getHandlerForEditor(editor, true);
                        if (afterAppendHandler) {
                            afterAppendHandler(currentCell, editor, undefined);
                        }


                        var rowIndex = (editAction === _.TCRUD.crudActionTypes.change ? currentRow.index() : 0);
                        var endEditFunction = function () {
                            _.CellMouseManager.endCellInlineEdit(currentCell);
                        };
                        var editorFinish = tableCreater.getTemplateAttribute(table, rowIndex, currentCell.index(), tableCreater.editorFinishAttrName);
                        var editorFinishEvent;
                        var eventProcessed = false;
                        if (!editorFinish) {
                            editorFinishEvent = tableCreater.getTemplateAttribute(table, rowIndex, currentCell.index(), tableCreater.editorFinishEventAttrName);
                            if (!editorFinishEvent) {
                                var h = tableInlineEditFinishHandler.getHandlerForEditor(editor, true);
                                if (h) {
                                    h(currentCell, editor, endEditFunction);
                                    eventProcessed = true;
                                } else {
                                    editorFinishEvent = "blur";
                                }
                            }
                        }
                        if (!eventProcessed) {
                            if (editorFinish) {
                                var func = new Function("$currentCell", "$editor", "$endEdit", editorFinish);
                                func(currentCell, editor, endEditFunction);
                            } else {
                                editor.on(editorFinishEvent, function (theFinishEvent, triggerReason) {
                                    //for normal blur event, triggerReason should be undefined
                                    //but for the blur tirgged for ko update, triggerReason _.TCRUD.triggerBlurForKOUpdate
                                    //on chrom, triggerReason is not correctly set, so we also add _.TCRUD.triggerBlurForKOUpdat to the editordiv directly
                                    if (triggerReason === _.TCRUD.triggerBlurForKOUpdate || _.dataEX(editorDiv, _.TCRUD.triggerBlurForKOUpdate) === _.TCRUD.triggerBlurForKOUpdate) {
                                        return;
                                    }
                                    endEditFunction();
                                });
                            }
                        }

                        editor.focus().select();
                    }
                    return true;
                } else {
                    return false;
                }
            }

            if (_.TCRUD.isCellInlineEditing(theCell)) {
                return;
            }
            if (beginInlineEdit(theCell)) _.TCRUD.setCellInlineEditiong(theCell, true);
        },

        endCellInlineEdit: function (theCell, reason) {
            theCell = $(theCell);
            theCell.removeClass(tableCreater.inlineEditingCellClass);
            var table = theCell.parents("table")[0];
            var attachData = _.getRelatedCRUDAttachData(table);
            //we have already make the attachData consist, so can just use the first one
            attachData = attachData[0];
            var bindingData = attachData.bindingData;

            function onFinishedEdit(cell, additionalData, esc) {
                if (typeof (esc) === "undefined") {
                    esc = false;
                }
                cell = $(cell);
                var theEditor = $(_.TCRUD.cellInlinEditorDiv(cell).children()[0]);
                if (!theEditor) return;
                var editorAttachData = _.dataEX(theEditor, _.TCRUD.editorAttachDataKey); //theEditor.data(_.TCRUD.editorAttachDataKey);
                if (!editorAttachData) return;
                var currentEditDataItem = editorAttachData.currentEditDataItem;
                var currentCell = cell;

                var theRow = cell.parents("tr");
                var item = _.TB.rowDataItem(theRow);

                var propName = tableCreater.getCellDataItemProperty(currentCell);

                var dataItemVerifyPass = true;
                if (esc) {
                    dataItemVerifyPass = false;
                } else if (bindingData.dataItemVerify && (!bindingData.dataItemVerify.call(attachData.viewModel, currentEditDataItem, editorAttachData.editAction, theEditor, undefined,
                    propName))) {
                    dataItemVerifyPass = false;
                }

                if (typeof (editorAttachData.originalChildren) === "string") {
                    currentCell.text(editorAttachData.originalChildren);
                }
                if (dataItemVerifyPass) {
                    _.TCRUD.assignEditItem(attachData, currentEditDataItem, item, propName);
                    _.TCRUD.modelStatus(item, _.TCRUD.modelStatusConsts.Changed);
                    if (ko.$helper && ko.$helper.browser.isIE && ko.$helper.browser.version <= 8) {
                        setTimeout(function () {
                            if (propName) {
                                if (ko.isObservable(item[propName])) {
                                    item[propName].valueHasMutated();
                                }
                            } else {
                                for (var p in item) {
                                    if (ko.isObservable(item[p])) {
                                        item[p].valueHasMutated();
                                    }
                                }
                            }
                        }, 50);
                    }
                } else {
                    //currentEditDataItem = item;
                    //why we need revocer the item
                    //in idea, it should not be changed
                    //but unfortunatel, is will be change by unknow reason, the editor will trigger a change event with empty value and if there is a format biding, 
                    //actually, the origianl item is changed
                    _.TCRUD.assignEditItem(attachData, editorAttachData.copiedDateItem2, item, propName);
                }
                if (typeof (editorAttachData.originalChildren) !== "string" && editorAttachData.originalChildren) {
                    editorAttachData.originalChildren.show();
                }
            }

            if (!_.TCRUD.isCellInlineEditing(theCell)) {
                return;
            }
            var editorDiv = _.TCRUD.cellInlinEditorDiv(theCell);
            //the call to the blur is very important, because for tab press, we prevent the key up default process, so when the code run in here
            //the ko is not update the viewmodel yet, so we have to tirgger the blur and force ko to update the viewmodel, then the value can be set correct
            //on chorm, when we trigger with _.TCRUD.triggerBlurForKOUpdate
            //"_.TCRUD.triggerBlurForKOUpdate" can't be passed to the event handler
            //so it will cause the editor thing the blur is from user action
            //so we have to add this tag direct to element to make it work
            _.dataEX(editorDiv, _.TCRUD.triggerBlurForKOUpdate, _.TCRUD.triggerBlurForKOUpdate);
            editorDiv.trigger("blur", _.TCRUD.triggerBlurForKOUpdate);
            editorDiv.children().trigger("blur", _.TCRUD.triggerBlurForKOUpdate);
            _.removeDataEx(editorDiv, _.TCRUD.triggerBlurForKOUpdate);
            var eventData = {};
            onFinishedEdit(theCell, eventData, reason === _.TCRUD.triggerEndInlineEditForESC);
            editorDiv.empty();
            editorDiv.remove();
            _.TCRUD.cellInlinEditorDiv(theCell, undefined);
            if (eventData.afterEditorsRemoved) {
                eventData.afterEditorsRemoved();
            }
            _.TCRUD.setCellInlineEditiong(theCell, false);
        }
    };

    //custom binding definition
    _.TB = ko.bindingHandlers.table = {
        selectMode: {
            rowSelect: "ROWSELECT",
            cellSelect: "CELLSELECT"
        },
        rowsChangedEventType: "tableRowsChanged",
        //forec to refresh, because I don't know why somt time, the html is not auto refreshed, that is to way, everything is there and ok, just not displaied
        //when you move mouse or right click on any place, the html will be re draw and you can see the right result
        //to work around, force to change height and change back to refresh
        forceRefreshUI: function (element, timeinterval) {
            //for IE10, it is undefined, for other browser, it is number
            //so if not undefined and is less than 10, then there is no refresh issues
            //so return to improve the performance
            if (!ko.$helper || !ko.$helper.browser.isIE || ko.$helper.browser.version !== 10) {
                return;
            }
            if (!timeinterval) {
                timeinterval = 100;
            }
            setTimeout(function () {
                //element.focus();
                element = $(element);
                var height = element.height();
                element.height(height + 1);
                element.height(height);
                element.height("auto");

                setTimeout(function () {
                    element = element.parent();
                    //element.focus();
                    height = element.height();
                    element.height(height + 1);
                    element.height(height);
                    element.height("auto");
                }, timeinterval);

            }, timeinterval);

        },

        isSelectedChangedEventName: "isSelectedChanged",
        isFocusChangedEventName: "isFocusChanged",

        //init the binding data protperties to the default value if not presented
        configDefault: function (bindingData) {
            if (typeof (bindingData.multiRowSelected) === "undefined") {
                bindingData.multiRowSelected = false;
            }
            if (typeof (bindingData.selectMode) === "undefined") {
                bindingData.selectMode = _.TB.selectMode.rowSelect;
            }

            return bindingData;
        },

        getTableRows: function (table) {
            return $(table).children("tbody").children("tr");
        },

        getTableCells: function (table) {
            return _.TB.getTableRows(table).children("td");
        },

        isRowSelected: function (tr) {
            tr = $(tr);
            var trData = _.rowAttachData(tr);
            var isSelected = tr.hasClass(tableCreater.selectedRowClass);
            //just logic check
            if (isSelected) { //for has selected class, the data.isSelected must be true
                if (trData.isSelected !== true) {
                    throw "row is selected, but internal data is not marked as selected.";
                }
            } else { //for not has the selected class, the data.isSelected must be false or undefined
                if (trData.isSelected) {
                    throw "row is selected, but internal data is not marked as selected.";
                }
            }
            return isSelected;
        },

        isCellSelected: function (td) {
            td = $(td);
            var tdData = _.cellAttachData(td);
            var isSelected = td.hasClass(tableCreater.selectedCellClass);
            //just logic check
            if (isSelected) { //for has selected class, the data.isSelected must be true
                if (tdData.isSelected !== true) {
                    throw "row is selected, but internal data is not marked as selected.";
                }
            } else { //for not has the selected class, the data.isSelected must be false or undefined
                if (tdData.isSelected) {
                    throw "row is selected, but internal data is not marked as selected.";
                }
            }
            return isSelected;
        },

        isCellFocus: function (td) {
            td = $(td);
            var tdData = _.cellAttachData(td);
            var isFocus = td.hasClass(tableCreater.focusCellClass);
            //just logic check
            if (isFocus) { //for has isFocus class, the data.isFocus must be true
                if (tdData.isFocus !== true) {
                    throw "row is focus, but internal data is not marked as focus.";
                }
            } else { //for not has the isFocus class, the data.isFocus must be false or undefined
                if (tdData.isFocus) {
                    throw "row is focus, but internal data is not marked as focus.";
                }
            }
            return isFocus;
        },

        selectCell: function (td, selected, focus) {
            if (selected === false) {
                focus = false;
            }
            td = $(td);
            if (td.length <= 0) {
                return;
            }
            if (td[0].tagName !== "TD") {
                throw td + " is not a td";
            }

            var table = td.parent("tr").parent("tbody").parent("table");
            var tdata = _.data(table);

            if (selected) {
                if (!_.UO(tdata.tableBindingData.multiRowSelected)) {
                    _.TB.clearAllRowsSelection(table);
                    _.TB.clearAllCellsSelection(table, td);
                }
                switch (_.UO(tdata.tableBindingData.selectMode)) {
                    case _.TB.selectMode.rowSelect:
                        _.TB.selectRow(td.parent()[0], true, true, false);
                        break;
                    case _.TB.selectMode.cellSelect:
                        break;
                    default:
                        throw "Not supported select mode";
                }
                td.addClass(tableCreater.selectedCellClass);
            } else {
                td.removeClass(tableCreater.selectedCellClass);
            }

            if (focus) {
                _.TB.getTableCells(table).each(function (index, element) {
                    if (td.is(element)) {
                        return;
                    }
                    _.TB.selectCell(element, _.TB.isCellSelected(element), false);
                });
                td.addClass(tableCreater.focusCellClass);
            } else if (typeof (focus) !== "undefined") {
                td.removeClass(tableCreater.focusCellClass);
            }

            var tdData = _.cellAttachData(td);
            if (typeof (tdData.isSelected) === "undefined") {
                tdData.isSelected = false;
            }
            if (tdData.isSelected !== selected) {
                tdData.isSelected = selected;
                td.trigger(_.TB.isSelectedChangedEventName, selected);
            }
            if (typeof (tdData.isFocus) === "undefined") {
                tdData.isFocus = false;
            }
            if (tdData.isFocus !== focus) {
                tdData.isFocus = focus;
                td.trigger(_.TB.isFocusChangedEventName, focus);
            }
            //we must set focus at the end, because when td.trigger(_.TB.isFocusChangedEventName, focus);
            //the inline editor maybe removed, then focus will be changed from this cell
            //so we have to focus it again
            if (focus && !_.TCRUD.isCellInlineEditing(td)) {
                td.focus();
            }
        },

        getSelectedCell: function (trOrTable) {
            trOrTable = $(trOrTable);
            var cellCollection;
            if (trOrTable.prop("tagName") !== "TR") { //table
                cellCollection = _.TB.getTableCells(trOrTable);
            } else { //row
                cellCollection = trOrTable.children("td");
            }
            return cellCollection.filter(function (index) {
                return _.TB.isCellSelected(cellCollection[index]);
            });
        },

        //return the focused not based on the actual focuse, but based on the our custom focuse css class and attach data
        //because in some case, the actual focused cell is not the looks like focused cell
        //so this function just return the looks like focused cell
        getFocusCell: function (trOrTablle) {
            var selectedCells = _.TB.getSelectedCell(trOrTablle);
            return selectedCells.filter(function (index) {
                return _.TB.isCellFocus(selectedCells[index]);
            });
        },

        clearAllCellsSelection: function (trOrTable, ignoreCells) {
            if (typeof (ignoreCells) === "undefined") {
                ignoreCells = [];
            }
            if (!$.isArray(ignoreCells)) {
                ignoreCells = [$(ignoreCells)];
            }
            var tds = [];
            var selectedCells = _.TB.getSelectedCell(trOrTable);
            for (var i = 0; i < selectedCells.length; i++) {

                var ignore = false;
                for (var k = 0; k < ignoreCells.length; k++) {
                    if (ignore) break;
                    for (var l = 0; l < ignoreCells[k].length; l++) {
                        if ($(selectedCells[i]).is(ignoreCells[k][l])) {
                            ignore = true;
                            break;
                        }
                    }
                }
                if (ignore) continue;

                tds.push(selectedCells[i]);
            }
            for (var j = 0; j < tds.length; j++) {
                _.TB.selectCell(tds[j], false, false);
            }
        },

        clearAllSelection: function (table) {
            _.TB.clearAllRowsSelection(table);
            _.TB.clearAllCellsSelection(table);
        },

        //if focus === undefined, then unchange it
        selectRow: function (tr, selected, forceRefresh, focus) {
            if (typeof (forceRefresh) === "undefined") {
                forceRefresh = true;
            }

            if (selected === false) {
                focus = false;
            }

            tr = $(tr);
            if (tr.length <= 0) {
                return;
            }
            if (tr[0].tagName !== "TR") {
                throw tr + " is not a tr";
            }

            var table = tr.parent("tbody").parent("table");
            var tdata = _.data(table);
            if (selected) {
                if (!_.UO(tdata.tableBindingData.multiRowSelected)) {
                    _.TB.clearAllCellsSelection(table);
                    _.TB.clearAllRowsSelection(table, false, tr);
                }
                tr.addClass(tableCreater.selectedRowClass);
            } else {
                switch (_.UO(tdata.tableBindingData.selectMode)) {
                    case _.TB.selectMode.rowSelect:
                        break;
                    case _.TB.selectMode.cellSelect:
                        break;
                    default:
                        throw "Not Suppoerted select mode";
                }
                tr.removeClass(tableCreater.selectedRowClass);
            }

            if (focus) {
                _.TB.getTableRows(table).each(function (index, element) {
                    if (tr.is(element)) { //itself
                        return;
                    }
                    _.TB.selectRow(element, _.TB.isRowSelected(element), false, false);
                });

                tr.addClass(tableCreater.focusRowClass);
            } else if (focus === false) { //if undefined then don't change
                tr.removeClass(tableCreater.focusRowClass);
            }

            var trData = _.rowAttachData(tr);
            if (typeof (trData.isSelected) === "undefined") {
                trData.isSelected = false;
            }
            if (trData.isSelected !== selected) {
                trData.isSelected = selected;
                if (tdata.selectedItems) {
                    var rowDataItem = _.TB.rowDataItem(tr);
                    var itemIndex = tdata.selectedItems.indexOf(rowDataItem);
                    if (selected && itemIndex < 0) {
                        if (!_.UO(tdata.tableBindingData.multiRowSelected)) {
                            tdata.selectedItems.removeAll();
                        }
                        tdata.selectedItems.push(rowDataItem);
                    }
                    if (!selected && itemIndex >= 0) {
                        tdata.selectedItems.splice(itemIndex, 1);
                    }
                }
                tr.trigger(_.TB.isSelectedChangedEventName, selected);
            }

            if (typeof (trData.isFocus) === "undefined") {
                trData.isFocus = false;
            }
            if (trData.isFocus !== focus) {
                trData.isFocus = focus;
                tr.trigger(_.TB.isFocusChangedEventName, focus);
            }
            //if (selected) {
            //    tr.focus();
            //}
            if (forceRefresh) {
                _.TB.forceRefreshUI(tr.parents("table")[0]);
            }
        },

        //if tryCell ===  true, then if no row is selected, then try to find a cell
        getSelectedRows: function (table, tryCell) {
            table = $(table);
            var row = _.TB.getTableRows(table).filter(function (index) {
                return _.TB.isRowSelected(this);
            });
            if (tryCell === true && (!row || row.length <= 0)) {
                row = _.TB.getSelectedCell(table);
                if (row && row.length > 0) {
                    row = row.parent("tr");
                }
            }
            return row;
        },

        clearAllRowsSelection: function (table, forceRefresh, ignoreRows) {
            if (typeof (forceRefresh) === "undefined") {
                forceRefresh = true;
            }
            if (typeof (ignoreRows) === "undefined") {
                ignoreRows = [];
            }
            if (!$.isArray(ignoreRows)) {
                ignoreRows = [$(ignoreRows)];
            }
            var trs = [];
            var selectedRows = _.TB.getSelectedRows(table);
            for (var i = 0; i < selectedRows.length; i++) {

                var ignore = false;
                for (var k = 0; k < ignoreRows.length; k++) {
                    if (ignore) break;
                    for (var l = 0; l < ignoreRows[k].length; l++) {
                        if ($(selectedRows[i]).is(ignoreRows[k][l])) {
                            ignore = true;
                            break;
                        }
                    }
                }
                if (ignore) continue;
                trs.push(selectedRows[i]);
            }
            for (var j = 0; j < trs.length; j++) {
                _.TB.selectRow(trs[j], false, forceRefresh, false);
            }
        },

        //update the latest data to the table attach data
        updateTableAttachData: function (data, bindingData) {
            data.tableBindingData = bindingData;
        },

        addNewDataRow: function (table, dataItem, appendToEnd) {
            if (typeof (appendToEnd) === "undefined") {
                appendToEnd = true;
            }
            _.TCRUD.modelStatus(dataItem, _.TCRUD.modelStatusConsts.New);
            var attachData = _.data(table);
            var addMethod = appendToEnd ? "push" : "unshift";
            if (attachData.tableBindingData.source[addMethod]) { //try test if the attachData.tableBindingData.source deinens push then use it
                (attachData.tableBindingData.source[addMethod])(dataItem);
            } else if (ko.isObservable(attachData.tableBindingData.source)) {
                //if is observable, then just add new item to the potential data collection and reset the observable to trigger the update function
                var source = attachData.tableBindingData.source();
                (source[addMethod])(dataItem);
                attachData.tableBindingData.source(source);
            } else {
                throw "can NOT porcess the data soure, don't know what it is";
            }
        },

        rowDataItem: function (tr, dataItem) {
            var rowAttachData = _.rowAttachData(tr);
            if (typeof (dataItem) === "undefined") {
                return rowAttachData.dataItem;
            }
            rowAttachData.dataItem = dataItem;
            return rowAttachData.dataItem;
        },

        deleteDataRow: function (table, dataItem) {
            //if new, then just remove it
            if (_.TCRUD.modelStatus(dataItem) === _.TCRUD.modelStatusConsts.New) {
                _.TB.getTableRows(table).each(function (index, element) {
                    if (_.TB.rowDataItem(element) === dataItem) {
                        var attachData = _.data(table);

                        if (attachData.tableBindingData.source.remove) { //try test if the attachData.tableBindingData.source deinens removeItem then use it
                            attachData.tableBindingData.source.remove(dataItem);
                        } else if (ko.isObservable(attachData.tableBindingData.source)) {
                            //if is observable, then just remove the item from the potential data collection and reset the observable to trigger the update function
                            var source = attachData.tableBindingData.source();

                            for (var i = 0; i < source.length; i++) {
                                if (source[i] === dataItem) {
                                    source.splice(i, i + 1);
                                    break;
                                }
                            }
                            attachData.tableBindingData.source(source);
                        } else {
                            throw "can NOT porcess the data soure, don't know what it is";
                        }
                    }
                });
            } else {
                //if not new, then mark it deleted
                _.TCRUD.modelStatus(dataItem, _.TCRUD.modelStatusConsts.Deleted);
                var tableAttachData = _.data(table);
                tableAttachData.tableBindingData.source.valueHasMutated();
            }
        },

        getRelatedCRUDEditMode: function (tableElement) {
            var tabledata = _.data(tableElement);
            var crudDatas = tabledata.relatedCRUDDatas;
            //make sure that all crud of the same table use same edit mode
            if (crudDatas && crudDatas.length > 0) {
                var lastEditModel = undefined;
                for (var l = 0; l < crudDatas.length; l++) {
                    if (typeof (lastEditModel) === "undefined") {
                        lastEditModel = _.UO(crudDatas[l].bindingData.editMode);
                    } else {
                        if (lastEditModel !== _.UO(crudDatas[l].bindingData.editMode)) {
                            throw "Not all tableCRUD binding for the same table specify same editMode.";
                        }
                    }
                }
                return lastEditModel;
            }
            return undefined;
        },

        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            if (element.tagName !== "TABLE") {
                throw "'table' binding can only be applied to table node.";
            }
            //current model data that is involved in this binding
            var tableBindingData = _.TB.configDefault(_.UO(valueAccessor()));
            var table = $(element);

            var tableElementAttachData = _.data(element);
            tableElementAttachData.originalRows = _.TB.getTableRows(table);
            //update the latest data to the table attach data
            _.TB.updateTableAttachData(tableElementAttachData, tableBindingData);

            _.TB.updateTableElement(true, table, tableBindingData, viewModel, bindingContext);

            return { controlsDescendantBindings: true };
        },

        update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var table = $(element);
            //current model data that is involved in this binding
            var tableBindingData = _.TB.configDefault(_.UO(valueAccessor()));
            _.TB.updateTableAttachData(_.data(element), tableBindingData);
            //update the latest data to the table attach data
            _.TB.updateTableElement(false, table, tableBindingData, viewModel, bindingContext);
        },

        getOrdersAccrodingHeader: function (table) {
            var orders = [];
            var table = $(table);
            if (table.prop("tagName") !== "TABLE") throw "Not Table";
            var thead = table.children("thead");
            var tHeadRow = thead.children("tr").first();
            for (var i = 0; i < tHeadRow.children().length; i++) {
                var th = $(tHeadRow.children()[i]);
                var asc = undefined;
                if (th.hasClass(tableCreater.orderedAscHeaderClass)) {
                    asc = true;
                } else if (th.hasClass(tableCreater.orderedDescHeaderClass)) {
                    asc = false;
                }
                if (typeof (asc) !== "undefined") {
                    var order_field = tableCreater.getCellOrderField(th);
                    if (order_field) {
                        orders.push({ field: order_field, asc: asc });
                    }
                }
            }
            return orders;
        },

        updateHeaderByOrders: function (table, orders) {
            var orders = _.UO(orders);
            var table = $(table);
            if (table.prop("tagName") !== "TABLE") throw "Not Table";
            var thead = table.children("thead");
            var tHeadRow = thead.children("tr").first();
            if (tHeadRow.length <= 0 && orders && orders.length > 0) {
                throw "Can NOT order a table without header";
            }
            var usedOrder = 0;
            tHeadRow.children().removeClass(tableCreater.orderedAscHeaderClass + " " + tableCreater.orderedDescHeaderClass);
            if (!orders) {
                return;
            }
            for (var i = 0; i < orders.length; i++) {
                var order = orders[i];
                for (var col = 0; col < tHeadRow.children().length; col++) {
                    var order_field = tableCreater.getCellOrderField(tHeadRow.children()[col]);
                    if (order_field && order_field === order.field) {
                        $(tHeadRow.children()[col]).addClass(order.asc ? tableCreater.orderedAscHeaderClass : tableCreater.orderedDescHeaderClass);
                        break;
                    }
                }
            }
        },

        addNewOrderToOrdersArray: function (orders, newOrder) {
            if (ko.isObservable(orders)) {
                throw "orders should be plain js array";
            }
            var same = undefined;
            for (var i = 0; i < orders.length; i++) {
                if (orders[i].field === newOrder.field) {
                    same = orders[i];
                    break;
                }
            }
            if (!same) {
                if (typeof (newOrder.asc) === "undefined") {
                    newOrder.asc = true;
                }
                orders.push(newOrder);
            } else {
                if (typeof (newOrder.asc) === "undefined") {
                    same.asc = !same.asc;
                } else {
                    same.asc = newOrder.asc;
                }
            }
        },

        removeOrderFromOrdersArray: function (orders, field) {
            if (ko.isObservable(orders)) {
                throw "orders should be plain js array";
            }
            var same = undefined;
            for (var i = 0; i < orders.length; i++) {
                if (orders[i].field === field) {
                    orders.splice(i, 1);
                    break;
                }
            }
        },

        getHeaderOrder: function (th) {
            th = $(th);
            if (th.prop("tagName") !== "TH") {
                throw "Should be TH";
            }
            if (th.hasClass(tableCreater.orderedAscHeaderClass) || th.hasClass(tableCreater.orderedDescHeaderClass)) {
                return { field: tableCreater.getCellOrderField(th), asc: th.hasClass(tableCreater.orderedAscHeaderClass) };
            }
            return undefined;
        },

        updateTableElement: function (init, table, tableBindingData, viewModel, bindingContext) {
            var source = _.UO(tableBindingData.source);

            //1. if thead is empty, then fill it based on the firt row data item's properties automaticlly
            var thead = table.children("thead").first();
            if (thead.length <= 0) {
                table.children().before("<thead></thead>");
                thead = table.children("thead");
            }
            if (thead.children().length <= 0) {
                if (source.length > 0) {
                    thead.append(tableCreater.createTHeadRow(source[0]));
                }
            }

            //2. create rows base on data itmems
            var tableElementAttachData = _.data(table);
            //originalRows should be served as the row template
            //if it is empty, then create a row template base on the first row data item
            if (!tableElementAttachData.originalRows || tableElementAttachData.originalRows.length <= 0) {
                if (source.length > 0) {
                    tableElementAttachData.originalRows = tableCreater.createRowTemplate(source[0], thead);
                }
            }
            table.children("tbody").empty();
            if (tableElementAttachData.selectedItems) {
                tableElementAttachData.selectedItems.removeAll();
            }
            if (!init) {
                //use tableElementAttachData.originalRows as template to create rows
                //we also append a property "rowsSourceData" to the bindingContext, which is the value of source variable
                //so that in the with binding, we can use it.
                //after below block of code, the tbody will contains all the rows template for all the data item
                //and each tr is surrounded with <!-- ko with: rowsSourceData[*] -->
                //for example:
                //<!-- ko with: rowsSourceData[*] -->
                //<tr ****>****</tr>
                //<!-- /ko -->
                //why we not use ko.applyBindingsToDescendants
                //because we hold tr, and if we call ko.applyBindingsToDescendants, then only the children and descendants of tr will has binding context
                //tr itself will not be bound, and ko doesn't provide a method to apply binding content directly to a node it self
                //so we have to wrape tr with virtual with so simualate this
                var tabindex = 1000;
                if (tableElementAttachData.originalRows) {
                    bindingContext = bindingContext.extend({ rowsSourceData: source });
                    var templateIndex = 0;
                    for (var i = 0; i < source.length; i++) {
                        if (_.TCRUD.modelStatus(source[i]) === _.TCRUD.modelStatusConsts.Deleted) {
                            continue;
                        }
                        var tr = $(tableElementAttachData.originalRows[templateIndex]).clone();
                        var cellCount = tr.children("td").length;
                        tr.children("td").remove();

                        tabindex += 10;
                        for (var cellIndex = 0; cellIndex < cellCount; cellIndex++) {
                            var cell = tableCreater.getCellTemplate(table, i, cellIndex);
                            var cellCreated;
                            if (cell instanceof jQuery) {
                                cellCreated = cell;
                            } else {
                                cellCreated = tableCreater.createCellTemplate(source[i], cell, tr);
                            }
                            tr.append(cellCreated);//*/
                            $(tr.children("td")[cellIndex]).attr("tabindex", tabindex);
                            tabindex += 10;
                            //tableCreater.clearTemplatesDefinition($(tr.children("td")[cellIndex]));
                        }
                        table.children("tbody").append("<!-- ko with: rowsSourceData[" + i + "] -->");
                        table.children("tbody").append(tr);
                        table.children("tbody").append("<!-- /ko -->");
                        //IE8 bug, if IE8 then although we set row data here, but later, we can't get it, don't know why
                        //so if IE8, we don't set it here, but after all rows are finished, ko binding are finished, we set them
                        //if (!ko.$helper.browser.isIE || ko.$helper.browser.version > 8) {
                        //    _.TB.rowDataItem(tr, source[i]);
                        //}
                        templateIndex = (templateIndex + 1) % tableElementAttachData.originalRows.length;
                    }
                }
            }
            if (tableBindingData.orders) {
                _.TB.updateHeaderByOrders(table, _.UO(tableBindingData.orders));
            }
            if (init) {
                //3. Apply binding data, as we return { controlsDescendantBindings: true }, so ko won't automaticly apply binding data to all
                //descendants of this table, so we need to manually apply the binding data to each of them
                for (var j = 0; j < table.children().length; j++) {
                    ko.applyBindingsToDescendants(bindingContext, table.children()[j]);
                }
                if (typeof (table.attr(tableCreater.notOrderAttName)) === "undefined") {
                    thead.children().children().each(function (index, theElement) {
                        var theTH = $(theElement);
                        if (tableCreater.isCellOrderable(theTH)) {
                            theTH.addClass(tableCreater.orderableColumnClass);
                        } else {
                            return;
                        }
                    });
                    //add event for header click to trigger order
                    thead.children().children().on('click', function (event) {
                        var th = $(event.currentTarget);
                        var orderField = tableCreater.getCellOrderField(th);
                        if (tableBindingData.beforeOrder) {
                            if ((_.UO(tableBindingData.beforeOrder)).call(viewModel, orderField, th, event) === false) {
                                return;
                            }
                        }
                        if (tableCreater.isCellOrderable(th)) {

                        } else {
                            return;
                        }
                        if (!orderField) {
                            return;
                        }
                        var orders = _.TB.getOrdersAccrodingHeader(table);
                        var o = _.TB.getHeaderOrder(th);
                        if (event.ctrlKey) {
                            if (o) {
                                _.TB.removeOrderFromOrdersArray(orders, o.field);
                            } else {
                                _.TB.addNewOrderToOrdersArray(orders, { field: orderField, asc: true });
                            }
                        } else {
                            if (!o) {
                                o = { field: orderField, asc: true };
                            } else {
                                o.asc = !o.asc;
                            }
                            orders = [o];
                        }
                        if (tableBindingData.orders) {
                            if (!ko.isObservable(tableBindingData.orders)) {
                                throw "table orders binding should be an observableArray";
                            }
                            tableBindingData.orders(orders);
                        }
                    });
                }
            } else {
                //as every time, tbody will be empty and recreate, so we need to apply binding to it again
                ko.applyBindingsToDescendants(bindingContext, table.children("tbody")[0]);

                _.TB.forceRefreshUI(table);

                var trs = _.TB.getTableRows(table);
                //IE8 bug, if IE8 then although we set row data here, but later, we can't get it, don't know why
                //so if IE8, we don't set it when we creating each row, but after all rows are finished, ko binding are finished, we set them
                if (true/*ko.$helper.browser.isIE && ko.$helper.browser.version <= 8*/) {
                    var sourceIndex = 0;

                    var nextSourceIndex = function (index) {
                        while (index < source.length) {
                            if (_.TCRUD.modelStatus(source[index]) !== _.TCRUD.modelStatusConsts.Deleted) {
                                return index;
                            }
                            index++;
                        }
                        return index;
                    };

                    for (var k = 0; k < trs.length; k++) {
                        sourceIndex = nextSourceIndex(sourceIndex);
                        _.TB.rowDataItem(trs[k], source[sourceIndex]);
                        sourceIndex++;
                    }
                    //in most case, sourceIndex should be point to the next to the last item in source
                    //that is sourceIndex === source.length
                    //but for one case, the last item of sourc is marked deleted
                    //then sourceIndex just points to it
                    if (sourceIndex !== source.length && _.TCRUD.modelStatus(source[sourceIndex]) !== _.TCRUD.modelStatusConsts.Deleted) {
                        throw "Logic Error";
                    }
                }

                var tds = trs.children("td");
                var crudEditMode = _.TB.getRelatedCRUDEditMode(table);

                tds.click(function (event) {
                    _.CellMouseManager.updateSelectFocus(event, tableBindingData.selectMode, tableBindingData.multiRowSelected, table, $(this));
                    if (tableBindingData.onRowClick) {
                        _.UO(tableBindingData.onRowClick)(event, source[i]);
                    }
                });
                var isInlineEditMode = (crudEditMode === _.TCRUD.editMode.inline);
                if (isInlineEditMode) {
                    tds.dblclick(function (event) {
                        _.CellMouseManager.beginInlinEdit(table, event.currentTarget);
                    });
                    tds.on(_.TB.isFocusChangedEventName, function (eventObject, newFocus) {
                        if (!newFocus) {
                            _.CellMouseManager.endCellInlineEdit(eventObject.currentTarget);
                        }
                    });
                }
                if (_.UO(tableBindingData.selectMode) === _.TB.selectMode.cellSelect) {
                    tds.keydown(function (event) {
                        //update again, because when the current cell is in inline edition
                        //then move to next cell will focus the cell first, then as the inlien editor is removed, then the focus will lost and the first cell of the table is focused
                        //so we have to use the _.TB.getFocusCell to always triger on the looks like focused cell
                        var theCell = _.TB.getFocusCell(table);
                        if (theCell.length <= 0) {
                            return true;
                        }

                        if (isInlineEditMode && (!_.TCRUD.isCellInlineEditing(theCell)) && _.isCharacterKeyPress(event)) {
                            _.CellMouseManager.beginInlinEdit(table, theCell);
                            return true;
                        }
                        //if tab or enter then always take action
                        //check if the cell is in inline editing, only act for esc key
                        //other key, such as arrow, only take action when it is not inline edit
                        var nextCell = undefined;
                        switch (event.keyCode) {
                            case 9://tab
                                if (event.shiftKey) {
                                    nextCell = _.nextCell(theCell, 0, -1, true);
                                } else {
                                    nextCell = _.nextCell(theCell, 0, 1, true);
                                }
                                break;
                            case 13://enter
                                nextCell = _.nextCell(theCell, 1, 0);
                                break;
                            default:
                                break;
                        }
                        if (_.TCRUD.isCellInlineEditing(theCell)) {
                            switch (event.keyCode) {
                                case 27: //esc
                                    _.CellMouseManager.endCellInlineEdit(theCell, _.TCRUD.triggerEndInlineEditForESC);
                                    theCell.focus(); //must select this cell again, becasue the esc will remove the focus form the cell, so it can't accept keydown event
                                    return true;
                                default:
                                    break;
                            }
                        } else if (isInlineEditMode) {
                            switch (event.keyCode) {
                                case 40: //down
                                    nextCell = _.nextCell(theCell, 1, 0);
                                    break;
                                case 38: //up
                                    nextCell = _.nextCell(theCell, -1, 0);
                                    break;
                                case 37://<-
                                    nextCell = _.nextCell(theCell, 0, -1);
                                    break;
                                case 39://->
                                    nextCell = _.nextCell(theCell, 0, 1);
                                    break;
                                default:
                                    break;
                            }
                        }
                        if (nextCell && nextCell.length > 0) {
                            _.CellMouseManager.updateSelectFocus(undefined, tableBindingData.selectMode, tableBindingData.multiRowSelected, table, nextCell);
                            //for IE8 when edit a cell with a complex component (for example, the editor is chosen, datetime picker and so on)
                            //although we have set the right cell with focus, but when the editor is removed, the cell will lost focus in IE 8
                            //so for ie 8, we set a time trigger to set that cell again
                            if (ko.utils.ieVersion <= 8 || (typeof (bowser) !== "undefined" && bowser.msie && bowser.version <= 8)) {
                                setTimeout(function () {
                                    _.CellMouseManager.updateSelectFocus(undefined, tableBindingData.selectMode, tableBindingData.multiRowSelected, table, nextCell);
                                }, 200);
                            }
                            //below is very important, because we must stop the default tab key process, so that the focus can be move to the correct cell that we need
                            event.preventDefault();
                            return false;
                        } else {
                            return true;
                        }
                    });
                }

                table.triggerHandler(_.TB.rowsChangedEventType, table);
            }
        }
    };

    //binding for isSelected
    _.RSelected = ko.bindingHandlers.isSelected = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            $(element).on(_.TB.isSelectedChangedEventName, function (event, selected) {
                valueAccessor(selected);
            });
        },
        update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            _.TB.selectRow(element, valueAccessor(), undefined, valueAccessor());
        }
    };

    _.TCRUD = ko.bindingHandlers.tableCRUD = {
        editMode: {
            modalPopup: "ModalPopup",
            inline: "Inline"
        },
        inlineEditorClassTag: "ko-binding-table-inline-editor",
        //inlineEditorFinishedEventName: "finishEditEvent",

        configDefault: function (bindingData) {
            if (!bindingData.editMode) {
                bindingData.editMode = _.TCRUD.editMode.modalPopup;
            }
            if (!bindingData.newEditMode) {
                bindingData.newEditMode = bindingData.editMode;
            }

            if (!bindingData.actionButtons) {
                bindingData.actionButtons = [_.TCRUD.crudActionTypes.add];

                //check editmode, if is inline, then for default don't show change button
                if (_.UO(bindingData.editMode) !== _.TCRUD.editMode.inline) {
                    bindingData.actionButtons.push(_.TCRUD.crudActionTypes.change);
                }

                bindingData.actionButtons.push(_.TCRUD.crudActionTypes['delete']);
            }

            if ($.inArray(_.TCRUD.crudActionTypes.add, _.UO(bindingData.actionButtons)) >= 0 && !bindingData.addBtnSelector) {
                bindingData.addBtnSelector = "[name='" + tableCreater.buttonDefaultNames.addBtnName + "']";
            }
            if ($.inArray(_.TCRUD.crudActionTypes['delete'], _.UO(bindingData.actionButtons)) >= 0 && !bindingData.delBtnSelector) {
                bindingData.delBtnSelector = "[name='" + tableCreater.buttonDefaultNames.delBtnName + "']";
            }

            if ($.inArray(_.TCRUD.crudActionTypes.change, _.UO(bindingData.actionButtons)) >= 0 && !bindingData.changeBtnSelector) {
                bindingData.changeBtnSelector = "[name='" + tableCreater.buttonDefaultNames.changeBtnName + "']";
            }
            if ($.inArray(_.TCRUD.crudActionTypes.save, _.UO(bindingData.actionButtons)) >= 0 && !bindingData.saveBtnSelector) {
                bindingData.saveBtnSelector = "[name='" + tableCreater.buttonDefaultNames.saveBtnName + "']";
            }
            if (typeof (bindingData.saveImmediately) === "undefined") {
                bindingData.saveImmediately = true;
            }

            return bindingData;
        },

        getTargetTable: function (element, bindingData) {
            if (bindingData.forTableSelector) {
                return $(_.UO(bindingData.forTableSelector));
            } else {
                return $(element).parents("table").first();
            }
        },

        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            element = $(element);
            var bindData = _.TCRUD.configDefault(valueAccessor());
            if (element.children().length <= 0) {
                element.html(tableCreater.createCRUDPanel(_.UO(bindData.actionButtons)));
            }

            if (bindData.addBtnSelector) {
                element.find(_.UO(bindData.addBtnSelector)).off('click', _.TCRUD.addBtnClick);
                element.find(_.UO(bindData.addBtnSelector)).on('click', element, _.TCRUD.addBtnClick);
            }
            if (bindData.delBtnSelector) {
                element.find(_.UO(bindData.delBtnSelector)).off('click', _.TCRUD.delBtnClick);
                element.find(_.UO(bindData.delBtnSelector)).on('click', element, _.TCRUD.delBtnClick);
            }
            if (bindData.changeBtnSelector) {
                element.find(_.UO(bindData.changeBtnSelector)).off('click', _.TCRUD.changeBtnClick);
                element.find(_.UO(bindData.changeBtnSelector)).on('click', element, _.TCRUD.changeBtnClick);
            }
            if (bindData.saveBtnSelector) {
                element.find(_.UO(bindData.saveBtnSelector)).off('click', _.TCRUD.saveBtnClick);
                element.find(_.UO(bindData.saveBtnSelector)).on('click', element, _.TCRUD.saveBtnClick);
            }
        },

        update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            element = $(element);
            var attachData = _.CRUDAttachData(element);
            attachData.bindingData = _.TCRUD.configDefault(valueAccessor());
            var targetTable = _.TCRUD.getTargetTable(element, attachData.bindingData);
            _.updateCrudTargetTable(attachData, targetTable);
            attachData.bindingContext = bindingContext;
            attachData.viewModel = viewModel;
        },
        getInlineEditors: function (table) {
            return $(table).find("." + _.TCRUD.inlineEditorClassTag);
        },

        isCellInlineEditing: function (cell) {
            var data = _.cellAttachData(cell);
            if (typeof (data.isInlineEditing) === "undefined") {
                data.isInlineEditing = false;
            }
            return data.isInlineEditing;
        },
        setCellInlineEditiong: function (cell, value) {
            _.cellAttachData(cell).isInlineEditing = value;
        },

        cellInlinEditorDiv: function (cell, div) {
            cell = $(cell);
            if (typeof (div) === "undefined") {
                if (!_.TCRUD.isCellInlineEditing(cell)) {
                    if (_.cellAttachData(cell).inlineEditorDiv) throw "the cell is not in inline editing, but it has a associate inline editor";
                }
                return _.cellAttachData(cell).inlineEditorDiv;
            } else {
                _.cellAttachData(cell).inlineEditorDiv = div;
            }
        },

        editorAttachDataKey: "attachedEditTmpDataKey",

        //make sure some important data are same between attachDatas
        makeSureAttachDataConsist: function (attachDatas) {
            if (attachDatas.length <= 1) {
                return true;
            }
            var data0 = attachDatas[0];
            var compareProperties = ['newItem', 'saveFunc', 'dataItemVerify', 'copyDataItem', 'assignDataItem', 'beforeShowEditor', 'prepareCRUDModal'];
            for (var i = 1; i < attachDatas.length; i++) {
                var data = attachDatas[i];
                if (data.viewModel != data0.viewMode) {
                    throw "crud binding data is not consist";
                }
                var bd0 = data0.bindingData;
                var bd = data.bindingData;
                for (var j = 0; j < compareProperties.length; j++) {
                    var p0 = _.UO(bd0[compareProperties[j]]);
                    var p = _.UO(bd[compareProperties[j]]);
                    if (p0 == p || (typeof (p0) === "undefined" && typeof (p) === "undefined")) {

                    } else {
                        throw "crud binding data is not consist";
                    }
                }
            }
            return true;
        },

        triggerBlurForKOUpdate: "trigger-blur-for-KO-update",
        triggerEndInlineEditForESC: "trigger-end-inline-edit-for-esc",

        modalResult: function (modalElement, result) {
            var data = $(modalElement).data(tableCreater.modalAttachDataKey);
            if (!data) {
                data = {};
                $(modalElement).data(tableCreater.modalAttachDataKey, data);
            }
            if (typeof (result) !== "undefined") {
                data.modalResult = result;
            } else {

            }
            return data.modalResult;
        },

        _getModelStatus: function (model) {
            var status = model.__status;
            if (typeof (status) === "undefined") {
                return status;
            }
            while (ko.isObservable(status)) {
                status = _.UO(status);
            }
            return status;
        },
        _setModelStatus: function (model, status, forceTrigger) {
            while (ko.isObservable(status)) {
                status = _.UO(status);
            }
            model.__status = status;
        },

        modelStatus: function (model, status, force) {
            if (typeof (model.__status) === "undefined") {
                _.TCRUD._setModelStatus(model, _.TCRUD.modelStatusConsts.Normal);
            }
            if (typeof (status) !== "undefined") {
                var c = _.TCRUD.modelStatusConsts;
                if (status !== c.New && status !== c.Changed && status !== c.Deleted && status !== c.Normal && !force) {
                    throw "status is not correct";
                }
                var oldStatus = _.TCRUD._getModelStatus(model);

                if (oldStatus === status) {
                    return status;
                }

                if (force) {
                    _.TCRUD._setModelStatus(model, status, true);
                    return status;
                }

                switch (status) {
                    case c.New:
                        if (oldStatus !== c.Normal) {
                            throw "change status error";
                        }
                        break;
                    case c.Changed:
                        if (oldStatus === c.New) {
                            status = c.New;
                        } else if (oldStatus !== c.Changed && oldStatus !== c.Normal) {
                            throw "change status error";
                        }
                        break;
                    case c.Deleted:
                        if (oldStatus !== c.Changed && oldStatus !== c.Normal) {
                            throw "change status error";
                        }
                        break;
                    case c.Normal:
                        break;
                    default:
                }
                _.TCRUD._setModelStatus(model, status);
            }
            return _.TCRUD._getModelStatus(model);
        },

        modelStatusConsts: {
            New: "NEW",
            Changed: "CHANGED",
            Deleted: "DELETED",
            Normal: "NORMAL",
        },

        crudActionTypes: {
            add: 'ADD',
            'delete': 'DELETE',
            change: 'CHANGE',
            save: 'SAVE'
        },

        convertModelStatusToActionType: function (status) {
            switch (status) {
                case _.TCRUD.modelStatusConsts.New:
                    return _.TCRUD.crudActionTypes.add;
                case _.TCRUD.modelStatusConsts.Changed:
                    return _.TCRUD.crudActionTypes.change;
                case _.TCRUD.modelStatusConsts.Deleted:
                    return _.TCRUD.crudActionTypes['delete'];
                case _.TCRUD.modelStatusConsts.Normal:
                    return undefined;
                default:
                    throw "unknown status";
            }
        },

        //copy the item, if provide the copyDataItem function, then use it, if not, then just loop on each prop, and copy
        copyEditItem: function (attachData, item) {
            var bindingData = attachData.bindingData;
            var copiedItem = {};
            if (bindingData.copyDataItem) {
                copiedItem = _.UO(bindingData.copyDataItem)(item);
            } else {
                for (var prop in item) {
                    //we create the observable wrapper so that it will be updated by the control editor
                    copiedItem[prop] = ko.observable(_.UO(item[prop]));
                }
            }
            return copiedItem;
        },

        //copy the sourceItem back to targetItem, if provide the assignDataItem function, then use it, if not, then just loop on each prop, and copy
        assignEditItem: function (attachData, sourceItem, targetItem, propName) {
            if (propName && !Object.prototype.hasOwnProperty.call(sourceItem, propName)) {
                throw "The given property '" + propName + "' doesn't in the source item";
            }
            var bindingData = attachData.bindingData;
            if (bindingData.assignDataItem) {
                _.UO(bindingData.assignDataItem)(sourceItem, targetItem, propName);
            } else {

                var assignProp = function (prop) {
                    if (ko.isObservable(targetItem[prop])) {
                        targetItem[prop](_.UO(sourceItem[prop]));
                    } else {
                        targetItem[prop] = _.UO(sourceItem[prop]);
                    }
                };

                if (propName) {
                    assignProp(propName);
                } else {
                    for (var theProp in sourceItem) {
                        assignProp(theProp);
                    }
                }
            }
        },

        generalEditFunction: function (event, action, isActionValid, getModalContentFromBindingData, getEditTargetItem, needCopyTargetItem, onOkCallback) {
            var crudElement = event.data;
            var attachData = _.CRUDAttachData(crudElement);
            var bindingData = attachData.bindingData;
            if (!isActionValid(attachData)) {
                return;
            }

            var item = getEditTargetItem(attachData);

            var copiedItem = item;
            if (needCopyTargetItem) {
                copiedItem = _.TCRUD.copyEditItem(attachData, item);
            }

            var editMode = _.UO(bindingData.editMode);
            if (action === _.TCRUD.crudActionTypes.add && bindingData.newEditMode) {
                editMode = _.UO(bindingData.newEditMode);
            }
            if (editMode === _.TCRUD.editMode.modalPopup) {
                var modalContent = getModalContentFromBindingData(bindingData);

                if (typeof (modalContent) === "undefined") {
                    modalContent = $(tableCreater.createCRUDEditor(_.TCRUD.getTargetTable(crudElement, bindingData), action))[0];
                }

                modalContent = $(modalContent).clone().removeAttr('id');

                var crudModalResult = tableCreater.createCRUDModal(modalContent, attachData, copiedItem, action);

                //must be add to the page
                //because some binding may has js that use $('#****') to find something
                //but when modalNode is not added, they can't find anything on it, a example is the chosen, which can't be created
                $("body").append(crudModalResult.root);

                var childBindingContext = attachData.bindingContext.createChildContext(copiedItem);
                ko.applyBindingsToDescendants(childBindingContext, $(crudModalResult.root)[0]);
                tableCreater.prepareCRUDModal(action, crudModalResult.root, modalContent, crudModalResult.okBtn, crudModalResult.cancelBtn, attachData, copiedItem);
                if (bindingData.prepareCRUDModal) {
                    (_.UO(bindingData.prepareCRUDModal)).call(attachData.viewMode, action, crudModalResult.root, modalContent, crudModalResult.okBtn, crudModalResult.cancelBtn, copiedItem);
                }

                if (bindingData.beforeShowEditor) {
                    if (_.UO(bindingData.beforeShowEditor).call(attachData.viewModel, action, modalContent, copiedItem) === false) return;
                }

                $(crudModalResult.root).on('hidden', function () {
                    if (_.TCRUD.modalResult(crudModalResult.root)) {
                        onOkCallback(attachData, item, copiedItem, editMode);

                        if (_.UO(bindingData.saveImmediately)) {
                            _.TCRUD.saveAllData(attachData);
                        }
                    }
                    $(crudModalResult.root).remove();
                });
                $(crudModalResult.root).modal({ backdrop: 'static' });
                //it is strange that when the modal is shown, the shown event is not tirggered until user click any input or move onto a button
                //but in the method prepareCRUDModal we registered shown event for some special process
                //so manually trigger shown event
                setTimeout(function () {
                    $(crudModalResult.root).trigger("shown");
                }, 500);
            } else {
                onOkCallback(attachData, item, copiedItem, editMode);
            }
        },

        commonPrepareCRUDAction: function (event, action) {
            var crudElement = event.data;
            var attachData = _.CRUDAttachData(crudElement);
            var table = _.TCRUD.getTargetTable(crudElement, attachData.bindingData);
            _.CellMouseManager.endTableInlineEdit(table);
        },

        addBtnClick: function (event) {
            _.TCRUD.commonPrepareCRUDAction(event, _.TCRUD.crudActionTypes.add);
            _.TCRUD.generalEditFunction(event, _.TCRUD.crudActionTypes.add,
                function (attachData) {
                    return true;
                },
                function (bindingData) {
                    if (bindingData.addEditorSelector) {
                        return $(_.UO(bindingData.addEditorSelector))[0];
                    }
                    return undefined;
                },
                function (attachData) {
                    return jsonObjectToKoViewModel(_.UO(attachData.bindingData.newItem).call(attachData.viewModel, true));
                }, true,
                function (attachData, item, copiedItem, editMode) {
                    _.TCRUD.assignEditItem(attachData, copiedItem, item);

                    _.TB.addNewDataRow(attachData.targetTable, item, _.UO(attachData.bindingData.addNewItemToEnd));
                    _.TB.clearAllRowsSelection(attachData.targetTable);
                    //if is inline edit mode, then auto begin edit of the first ediable cell
                    if (editMode === _.TCRUD.editMode.inline) {
                        var row = undefined;
                        var crudElement = event.data;
                        var bindingData = attachData.bindingData;
                        var table = _.TCRUD.getTargetTable(crudElement, bindingData);
                        //find the corresponding row
                        _.TB.getTableRows(table).each(function (index, e) {
                            if (_.TB.rowDataItem(e) === item) {
                                row = $(e);
                            }
                        });
                        if (typeof (row) !== "undefined") {
                            var cell = undefined;
                            //find the first editable cell
                            row.children().each(function (index, c) {
                                if (!cell && tableCreater.isColEditableShown(table, index, _.TCRUD.crudActionTypes.add)) {
                                    cell = $(c);
                                }
                            });
                            if (typeof (cell) !== "undefined") {
                                _.TB.selectCell(cell, true, true);
                                _.CellMouseManager.beginInlinEdit(table, cell, _.TCRUD.crudActionTypes.add);
                            }
                        }
                    }
                });
        },

        delBtnClick: function (event) {
            _.TCRUD.commonPrepareCRUDAction(event, _.TCRUD.crudActionTypes['delete']);
            _.TCRUD.generalEditFunction(event, _.TCRUD.crudActionTypes['delete'],
                function (attachData) {
                    var selectedRow = _.TB.getSelectedRows(attachData.targetTable, true);
                    if (selectedRow.length <= 0) {
                        if (tableHelper.messageBox) {
                            tableHelper.messageBox(tableResource.NoRowSelectDel, undefined, [{ text: tableResource.Ok, result: tableHelper.Buttons.Ok }]);
                        } else {
                            alert(tableResource.NoRowSelectDel);
                        }
                        return false;
                    }
                    return true;
                },
                function (bindingData) {
                    if (bindingData.delEditorSelector) {
                        return $(_.UO(bindingData.delEditorSelector))[0];
                    }
                    return undefined;
                },
                function (attachData) {
                    return _.TB.rowDataItem(_.TB.getSelectedRows(attachData.targetTable, true));
                }, false,
                function (attachData, item, copiedItem, editMode) {
                    _.TB.deleteDataRow(attachData.targetTable, item);
                });
        },

        changeBtnClick: function (event) {
            _.TCRUD.commonPrepareCRUDAction(event, _.TCRUD.crudActionTypes.change);
            _.TCRUD.generalEditFunction(event, _.TCRUD.crudActionTypes.change,
                function (attachData) {
                    var selectedRow = _.TB.getSelectedRows(attachData.targetTable, true);
                    if (selectedRow.length <= 0) {
                        if (tableHelper.messageBox) {
                            tableHelper.messageBox(tableResource.NoRowSelectEdit, undefined, [{ text: tableResource.Ok, result: tableHelper.Buttons.Ok }]);
                        } else {
                            alert(tableResource.NoRowSelectEdit);
                        }
                        return false;
                    }
                    if (selectedRow.length > 1) {
                        if (tableHelper.messageBox) {
                            tableHelper.messageBox(tableResource.OnlyOneRowSelect, undefined, [{ text: tableResource.Ok, result: tableHelper.Buttons.Ok }]);
                        } else {
                            alert(tableResource.OnlyOneRowSelect);
                        }
                        return false;
                    }
                    return true;
                },
                function (bindingData) {
                    if (bindingData.changeEditorSelector) {
                        return $(_.UO(bindingData.changeEditorSelector))[0];
                    }
                    return undefined;
                },
                function (attachData) {
                    return _.TB.rowDataItem(_.TB.getSelectedRows(attachData.targetTable, true));
                }, true,
                function (attachData, item, copiedItem, editMode) {
                    _.TCRUD.assignEditItem(attachData, copiedItem, item);
                    _.TCRUD.modelStatus(item, _.TCRUD.modelStatusConsts.Changed);
                });
        },

        saveBtnClick: function (event) {
            _.TCRUD.commonPrepareCRUDAction(event, _.TCRUD.crudActionTypes.save);
            var crudElement = event.data;
            var attachData = _.CRUDAttachData(crudElement);
            //var bindingData = attachData.bindingData;
            _.TCRUD.saveAllData(attachData);
        },

        saveAllData: function (attachData) {
            var bindingData = attachData.bindingData;
            if (bindingData.dataItemVerify && !bindingData.dataItemVerify.call(attachData.viewModel)) {
                return;
            }
            if (bindingData.saveFunc) {
                (_.UO(bindingData.saveFunc)).call(attachData.viewModel);
            }
        }
    };

    _.TP = ko.bindingHandlers.tablePaging = {
        defaultContainerNames: {
            inforContainer: "PagingInforContainer",
            navContainer: "PagingNavigateContainer"
        },

        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            element = $(element);
            var bindData = valueAccessor();
            if (!bindData.pageInfoContainerSelector) {
                bindData.pageInfoContainerSelector = "[name=" + _.TP.defaultContainerNames.inforContainer + "]";
                element.append(tableCreater.createPagingInfoPanel(_.TP.defaultContainerNames.inforContainer));
            }

            if (!bindData.pageNavigateContainerSelector) {
                bindData.pageNavigateContainerSelector = "[name=" + _.TP.defaultContainerNames.navContainer + "]";
                element.append(tableCreater.createPagingNavigatePanel(_.TP.defaultContainerNames.navContainer));
            }
            _.pagingAttachData(element).bindingData = bindData;
        },
        update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            element = $(element);
            var bindData = valueAccessor();
            var attachData = _.pagingAttachData(element);
            $.extend(attachData.bindingData, bindData);
            bindData = attachData.bindingData;
            var totalCount = _.UO(bindData.totalCount);
            var onePageItemsCount = _.UO(bindData.onePageItemsCount);
            var totalPageCount = parseInt(totalCount / onePageItemsCount, 10);
            if (totalPageCount * onePageItemsCount < totalCount) {
                totalPageCount += 1;
            }
            var currentPageIndex = _.UO(bindData.currentPageIndex);
            var from = onePageItemsCount * currentPageIndex + 1;
            if (from < 0) {
                from = 0;
            }
            var to = from + onePageItemsCount - 1;
            if (to > totalCount) {
                to = totalCount;
            }
            element.find(bindData.pageInfoContainerSelector).html(tableCreater.getPagingInformation(from, to, totalCount));

            var navPanel = element.find(bindData.pageNavigateContainerSelector);
            navPanel.empty();
            navPanel.append(tableCreater.createPagingNavigateContent(currentPageIndex, totalPageCount, onePageItemsCount, 7, attachData));
        }
    };

    _.TSI = ko.bindingHandlers.tableSelectedItems = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            element = $(element);
            if (element.prop("tagName") !== "TABLE") {
                throw "tableSelectedItems can be only applied on Table";
            }
            var selectedItems = valueAccessor();
            _.data(element).selectedItems = selectedItems;
            if (!ko.isObservable(selectedItems)) {
                throw "to enable update ui when vm is updated, the tableSelectedItems should be an observableArray";
            }
        },
        update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            element = $(element);
            var selectedItems = valueAccessor();
            var attachData = _.data(element);
            attachData.selectedItems = selectedItems;
            //currently, we can't support update selectedItem array to auto select the row
            //because ko will trigger this update method before the internal array actually got updated
            //so when this method is triggered, the new item hasn't been added to the array yet
            //var trs = _.TB.getTableRows(element);
            //trs.each(function (index, tr) {
            //    var rowData = _.TB.rowDataItem(tr);
            //    _.TB.selectRow(tr, selectedItems.indexOf(rowData) >= 0, false);
            //});
        }
    };
})();

//plugin
tableCreater = $.extend(tableCreater, {
    templatesTagName: "templates",
    cellTemplateAttrName: "cellTemplate",
    cellTemplateTagName: "cell",
    editorTemplateAttrName: "editorTemplate",
    editorTemplateTagName: "editor",
    dataItemPropertyAttrName: "dataItemProperty",
    tdClassAttrName: "tdClass",
    notEditAttrName: "notEdit",
    notAddAttrName: "notAdd",
    notOrderAttName: "notOrder",

    editorFinishEventAttrName: "editorFinishEvent",
    editorFinishAttrName: "editorFinish",
    orderFieldAttrName: "order-field",

    createTHeadRow: function (dataItem) {
        var tr = $('<tr></tr>');
        for (var prop in dataItem) {
            tr.append('<th class="ui-state-default" role="columnheader" aria-label="' + prop + '" ' + tableCreater.cellTemplateAttrName + '="' + prop + '" aria-sort="ascending" rowspan="1" colspan="1">' +
                '<div class="DataTables_sort_wrapper">' + prop + '<span class="DataTables_sort_icon css_right ui-icon ui-icon-triangle-1-n"></span></div></th>');
        }
        return tr;
    },

    createRowTemplate: function (dataItem, thead) {
        var useColToDefineRowCell = false;
        if (thead.children("tr").length > 0 && thead.children("tr").first().children("th[" + tableCreater.cellTemplateAttrName + "]").length > 0) {
            useColToDefineRowCell = true;
        }
        var tr = $('<tr></tr>');
        if (useColToDefineRowCell) { //use column information to define the row cells
            thead.children("tr").first().children("th").each(function (index, element) {
                tr.append(tableCreater.createCellTemplate(dataItem, $(element).attr(tableCreater.cellTemplateAttrName), element));
            });
        } else { //use property of dataItem
            for (var prop in dataItem) {
                tr.append(tableCreater.createCellTemplate(dataItem, prop));
            }
        }

        return tr;
    },

    ///propName is the cell display for, colTr is the col if useColToDefineRowCell
    createCellTemplate: function (dataItem, propName, coltr) {
        if (propName) {
            var td;
            if (propName.indexOf("BIND:") === 0) {
                td = $('<td data-bind="' + propName.substr("BIND:".length, propName.length - "BIND:".length) + '" ></td>');
            } else if (propName.indexOf(tableCreater.templatePreFix_HTML) === 0) {
                var htmlContent = $.trim(propName.substr(tableCreater.templatePreFix_HTML.length, propName.length - tableCreater.templatePreFix_HTML.length));
                htmlContent = htmlContent.replace("|-)", " >").replace("(-|", "<");
                td = $(htmlContent);
                if (td.prop("tagName") !== "TD") {
                    throw "The cell template should be TD";
                }
            } else if (propName.indexOf("JS:") === 0) {
                td = $.globalEval(propName.substr("JS:".length, propName.length - "JS:".length));
            } else {
                if (typeof (dataItem[propName]) === "boolean") {
                    td = $('<td><input type="checkbox" readonly data-bind="value: ' + propName + '" /></td>');
                } else {
                    td = $('<td data-bind="text: ' + propName + '" ></td>');
                }
            }
            if (coltr && $(coltr).attr(tableCreater.tdClassAttrName)) {
                td.addClass($(coltr).attr(tableCreater.tdClassAttrName));
            }
            return td;
        } else {
            return $('<td></td>');
        }
    },

    createCRUDFieldEditor: function (propName, action, readonly) {
        var editor;
        if (propName.indexOf("BIND:") === 0) {
            if (readonly /*&& action === ko.bindingHandlers.tableCRUD.crudActionTypes.change*/) {
                editor = $('<span class="uneditable-input" data-bind="' + propName.substr("BIND:".length, propName.length - "BIND:".length) + '" ></span>');
            } else {
                editor = $('<input type="text" data-bind="' + propName.substr("BIND:".length, propName.length - "BIND:".length) + '" />');
            }
        } else if (propName.indexOf(tableCreater.templatePreFix_HTML) === 0) {
            var htmlContent = $.trim(propName.substr(tableCreater.templatePreFix_HTML.length, propName.length - tableCreater.templatePreFix_HTML.length));
            htmlContent = htmlContent.replace("|-)", " >").replace("(-|", "<");
            editor = $(htmlContent);
        } else if (propName.indexOf("JS:") === 0) {
            editor = $.globalEval(propName.substr("JS:".length, propName.length - "JS:".length));
        } else {
            if (readonly /*&& action === ko.bindingHandlers.tableCRUD.crudActionTypes.change*/) {
                editor = $('<span class="uneditable-input" data-bind="text:' + propName + '" ></span>');
            } else {
                editor = $("<input type='text' data-bind='value:" + propName + "' placeholder='" + propName + "' />");
            }
        }

        return editor;
    },

    templatePreFix_HTML: "HTML:",

    selectedRowClass: "selected-cb-ko-binding-table-row",
    focusRowClass: "focus-cb-ko-binding-table-row",
    selectedCellClass: "selected-cb-ko-binding-table-cell",
    focusCellClass: "focus-cb-ko-binding-table-cell",
    inlineEditingCellClass: "inline-editing-cb-ko-binding-table-cell",
    orderedAscHeaderClass: "order-asc-cb-ko-binding-table-header",
    orderedDescHeaderClass: "order-desc-cb-ko-binding-table-header",
    orderableColumnClass: "orderable-column-cb-ko-binding-table-header",
    buttonDefaultNames: {
        addBtnName: "addrowbutton",
        delBtnName: "deleterowbutton",
        changeBtnName: "changerowbutton",
        saveBtnName: "saverowbutton"
    },

    crudButtonsContainerClass: "pull-right crud-container btn-group",

    createCRUDPanel: function (actionButtons) {

        function arrayIndex(content) {
            if (typeof (actionButtons) === "undefined") {
                return false;
            }
            for (var i = 0; i < actionButtons.length; i++) {
                if (actionButtons[i] === content) {
                    return true;
                }
            }
            return false;
        }

        var btnTypes = ko.bindingHandlers.tableCRUD.crudActionTypes;

        var html =
            '<div class="clearfix" style="padding: 0px 5px;">' +
                '<div class="' + tableCreater.crudButtonsContainerClass + '">';
        if (arrayIndex(btnTypes.add)) {
            html += '<button name="' + tableCreater.buttonDefaultNames.addBtnName + '" class="btn btn-small btn-primary" href="#"><i class="icon-plus"></i>&nbsp;' + tableResource.Add + '</button>';
        }
        if (arrayIndex(btnTypes.change)) {
            html += '<button name="' + tableCreater.buttonDefaultNames.changeBtnName + '" class="btn btn-small btn-primary" href="#"><i class="icon-pencil"></i>&nbsp;' + tableResource.Change + '</button>';
        }
        if (arrayIndex(btnTypes['delete'])) {
            html += '<button name="' + tableCreater.buttonDefaultNames.delBtnName + '" class="btn btn-small btn-warning" href="#"><i class="icon-trash"></i>&nbsp;' + tableResource['Delete'] + '</button>';
        }
        if (arrayIndex(btnTypes.save)) {
            html += '<button name="' + tableCreater.buttonDefaultNames.saveBtnName + '" class="btn btn-small btn-success" href="#"><i class="icon-save"></i>&nbsp;' + tableResource.SaveChanges + '</button>';
        }
        html += '</div>' +
            '</div>';
        return html;
    },

    modalAttachDataKey: "modalAttachDataKey",

    defaultModalEditorContainerBodyClass: "modal-body",

    prepareCRUDModal: function (action, modalRoot, modalContent, okBtn, cancelBtn, attachedData, targetDataItem) {
        modalRoot = $(modalRoot);
        modalContent = $(modalContent);
        okBtn = $(okBtn);
        cancelBtn = $(cancelBtn);
        //cancel button
        cancelBtn.on("click", function () {
            ko.bindingHandlers.tableCRUD.modalResult(modalRoot, false);
            modalRoot.modal('hide');
        });
        //ok button
        okBtn.on("click", function () {
            if (attachedData.bindingData.dataItemVerify && (!attachedData.bindingData.dataItemVerify.call(attachedData.viewModel, targetDataItem, action, modalContent, modalRoot))) {
                return;
            }
            ko.bindingHandlers.tableCRUD.modalResult(modalRoot, true);
            modalRoot.modal('hide');
        });

        if (action === ko.bindingHandlers.tableCRUD.crudActionTypes.add || action === ko.bindingHandlers.tableCRUD.crudActionTypes.change) {
            //this function is for:
            //1. modal is popuped, but the input is not ready to get the focus, so manually set focus
            //2. if the editor has chose, the dropdown is position as absolute, so the height of the dropdown is not included in the parent height
            //then this will cause the parent (.modal-body) has scroll bar (the height of .modal-body doen't include dropdown, but the scroll bar calculation include it)
            //that is to say, the .modal-body don't auto extend itself to contain dropdown, and then scroll bar shown
            //for normal control like input, it is ok, becasue modal-body will auto extends itself
            //but for chosen, it won't
            //so we set .modal-body overflow to visible to disable the scroll bar if the content height (include not visibile) is less them max height
            //then .modal-body won't have scroll bar, and the drowdown will be shown even it exceed the range of .modal-body
            //but this cause that, if there are too many ediotrs, the height of the .modal-body is too long, then exceed max-height
            //then there is no scroll bar, and the content will move outside the range of .modal-body
            //so we add code to check, and if so, then don't change
            modalRoot.on('shown', function () {
                var modal_body_css = "." + tableCreater.defaultModalEditorContainerBodyClass;
                $(this).find("input,button").blur();
                $(this).find(modal_body_css + " :input").first().focus().select();
                if ($(this).find(modal_body_css).length > 0) {
                    var modalbody = $(this).find(modal_body_css);
                    var maxHeight = modalbody.css("max-height");
                    maxHeight = tableHelper.convertToPixelValue(maxHeight);
                    //if the modalbody height(include not visible part) is less then the maxHeight (if user defined by css or style, for no maxheight, 
                    //the convertToPixelValue will return double.NaN, so it is always false to compare a nan with a number, so for no maxheight, we also don't change),
                    //when modalbody height(include not visible part) is less then the maxHeight, it is safe to set it no scroll (to visible), so the dorpdown will be shown event it is out of range
                    if (modalbody.prop("scrollHeight") < maxHeight) {
                        modalbody.css("overflow-y", "visible");
                    }
                }
            });
        }

        if (modalContent.css("display") === "none") {
            modalContent.show();
        }
    },

    createCRUDModal: function (modalContent, attachedData, targetDataItem, action) {
        var root = $("<div>").addClass("modal hide fade in").attr("aria-hidden", true).hide();
        var content = $('<div class="modal-dialog"><div class="modal-content"></div></div>');
        root.append(content);
        content = content.children("div");
        var html;
        //'<div class="black-box modal hide fade in" aria-hidden="true" style="display: none;">' +
        //'  <div class="modal-header tab-header">                                                            ' +
        //'    <button class="close" type="button" data-dismiss="modal">×</button>                            ' +
        //'    <span>Some modal title</span>                                                                  ' +
        //'  </div>                                                                                           ' +
        //'  <div class="modal-body separator">                                                               ' +
        //'    *****CONTENT*****                                                                              ' +
        //'  </div>                                                                                           ' +
        //'  <div class="modal-footer">                                                                       ' +
        //'    <div class="inner-well">                                                                       ' +
        //'      <a class="button mini rounded light-gray" data-dismiss="modal" >Cancel</a>  ' +
        //'      <a class="button mini rounded blue" >OK</a>    ' +
        //'    </div>                                                                                         ' +
        //'  </div>                                                                                           ' +
        //'</div>                                                                                             ';

        html = $("<div/>").addClass("modal-header").append(
            $("<button/>").addClass("close").attr("type", "button").attr("data-dismiss", "modal").html("x").on("click", function () {
                ko.bindingHandlers.tableCRUD.modalResult(root, false);
                root.modal('hide');
            }));
        html.append($("<span/>"));
        content.append(html);

        content.append($("<div/>").addClass("modal-body separator").append($(modalContent)));
        html = $("<div/>").addClass("modal-footer");

        var cancelBtn = $("<button/>").addClass("btn btn-small ")/*.attr("data-dismiss", "modal")*/.html(tableResource.Cancel);
        html.append(cancelBtn);
        //ok button
        var okBtn = $("<button/>").addClass("btn btn-small btn-primary")/*.attr("data-dismiss", "modal")*/.html(tableResource.Ok);
        html.append(okBtn);
        content.append(html);
        //modalContent.show();
        return { root: root, cancelBtn: cancelBtn, okBtn: okBtn };
    },

    getOriginalRowCell: function (table, rowIndex, colIndex) {
        table = $(table);
        var originalRows = tableCreater._.data(table).originalRows;
        if (originalRows && originalRows.length > 0) {
            rowIndex = rowIndex % originalRows.length;
            return $($(originalRows[rowIndex]).children()[colIndex]);
        }
        return undefined;
    },

    //get the attribute value defined in cell original template (original tr in tbody), if no tr in tbody or no such attribute in this cell template, then try to find from the corresponding thead > tr > td
    getTemplateAttribute: function (table, rowIndex, colIndex, attrName) {
        var attrValue;
        var originalRowCell = $(tableCreater.getOriginalRowCell(table, rowIndex, colIndex));
        if (originalRowCell) {
            if (typeof (attrName) === "undefined") {
                attrValue = originalRowCell.clone();
            } else {
                attrValue = originalRowCell.attr(attrName);
            }
            if (attrValue) {
                return attrValue;
            }
        }
        var trOfHead = $($(table.children("thead")[0]).children("tr")[0]);
        if (typeof (attrName) === "undefined") {
            return $(trOfHead.children()[colIndex]).clone();
        } else {
            return $(trOfHead.children()[colIndex]).attr(attrName);
        }
    },

    readonlyTemplate: 'READONLY',

    getEditableRelatedAttr: function (table, colIndex, action) {
        var c = ko.bindingHandlers.tableCRUD.crudActionTypes;
        var attrValue;
        switch (action) {
            case c.add:
                //notAdd
                attrValue = tableCreater.getTemplateAttribute(table, 0, colIndex, tableCreater.notAddAttrName);
                break;
            case c.change:
                //notEdit
                var rowIndex = 0;
                var selectedRow = ko.bindingHandlers.table.getSelectedRows(table, true);
                if (selectedRow.length > 0) {
                    rowIndex = $(selectedRow[0]).index();
                }
                attrValue = tableCreater.getTemplateAttribute(table, rowIndex, colIndex, tableCreater.notEditAttrName);
                break;
            default:
                throw "Not supported action";
        }
        return attrValue;
    },

    //is editable means can field editor be shown for the action
    //if is not editable, then for inline model, the cell can't be edit, for dialog model, the filed won't be shown
    //as jquery attr is case insensitive, so the notAdd= and notadd are same
    //notAdd="notadd" means is not visible for add, and ofcourse is readonly
    //notAdd="READONLY" means is shown on add, but is readonly
    //notEdit="notedit" means is not visible for change, and ofcourse is readonly
    //notEdit="READONLY" means is shown on change, but is readonly
    isColEditableShown: function (table, colIndex, action) {
        var attrValue = tableCreater.getEditableRelatedAttr(table, colIndex, action);
        return (typeof (attrValue) === "undefined") || (attrValue === tableCreater.readonlyTemplate);
    },

    //if the field readonly, for the action
    //the difference to isColEditableShown is it just check if the  field can be changed, it doesn't care if the field editor should be shown
    //notEdit
    isColReadOnly: function (table, colIndex, action) {
        var attrValue = tableCreater.getEditableRelatedAttr(table, colIndex, action);
        return typeof (attrValue) !== "undefined";
    },

    //this function return the html of the result
    changeTag: function (element, newTag, returnHtml) {
        element = $(element);
        var nodeHtml = element[0].outerHTML.toLowerCase();
        var nodeTag = element.prop("tagName").toLowerCase();
        nodeHtml = "<" + newTag + ">" + nodeHtml.substring(nodeTag.length + 2);
        if (nodeHtml.indexOf("/>", nodeHtml.length - "/>".length) === -1) { //not end with />
            nodeHtml = nodeHtml.substr(0, nodeHtml.length - ("</" + nodeTag + ">").length) + "</" + newTag + ">";
        }
        if (returnHtml) {
            return nodeHtml;
        }
        return $(nodeHtml);
    },

    //get the defined template inside the tr/td in the tbody
    //such as <templates><cell>...</cell></template>, <templates><editor>...</editor></template>
    //please note: it return the node <cell> or <editor> and so on not only their childern
    getCellTemplateNodeOfOriginalRow: function (table, rowIndex, colIndex, templateTag) {
        table = $(table);
        //1. try to get the <templates><cell>...</cell></template> from the tr/td in the tbody
        var originalRowCell = tableCreater.getOriginalRowCell(table, rowIndex, colIndex);
        if (originalRowCell) {
            var templates = originalRowCell.children(tableCreater.templatesTagName);
            if (templates && templates.length > 0) {
                var cellTemplate = originalRowCell.find(templateTag);
                if (cellTemplate && templates.length > 0) {
                    return cellTemplate;
                }
            }
        }
        return undefined;
    },

    clearTemplatesDefinition: function (cell) {
        $(cell).children(tableCreater.templatesTagName).remove();
    },

    //this function get the template str that how the td should be shown in the table
    //if return string then the is BIND: *** or HTML: *** or any other valid string
    //if return JQuery object, then it is the td it self and can be used directly
    getCellTemplate: function (table, rowIndex, colIndex) {
        table = $(table);
        //1. try to get the <templates><cell>...</cell></template> from the tr/td in the tbody
        var result = tableCreater.getCellTemplateNodeOfOriginalRow(table, rowIndex, colIndex, tableCreater.cellTemplateTagName);

        //2. if failed, then try to get the definition from the attribute in tr/td in the tbody or thead
        if (typeof (result) === "undefined") {
            result = tableCreater.getTemplateAttribute(table, rowIndex, colIndex, tableCreater.cellTemplateAttrName);
        } else { //get template successfully, change it to html rxpression
            var originalRowCell = tableCreater.getOriginalRowCell(table, rowIndex, colIndex);
            if (typeof (originalRowCell) === "undefined") {
                originalRowCell = $("<td>");
            }
            originalRowCell = originalRowCell.clone();
            tableCreater.clearTemplatesDefinition(originalRowCell);
            originalRowCell.append(result.html());
            result = originalRowCell;
        }
        //3. if failed, then try to get the td/td it self
        if (typeof (result) === "undefined") {
            result = tableCreater.getTemplateAttribute(table, rowIndex, colIndex, undefined);
            tableCreater.clearTemplatesDefinition(result)
        }
        return result;
    },

    //col is the corresponding td in the thead
    //always return string which is BIND: *** or HTML: *** or any other valid string
    getCellEditorTemplate: function (col, action, table) {
        table = $(table);
        col = $(col);
        var originalRows = tableCreater._.data(table).originalRows;
        var rowIndex = 0;
        if (action === ko.bindingHandlers.tableCRUD.crudActionTypes.change) {
            var selectedRow = ko.bindingHandlers.table.getSelectedRows(table, true);
            if (selectedRow.length > 0) {
                rowIndex = $(selectedRow[0]).index();
            }
        }
        var shouldChangeToHTMLExpression = false;
        var resultTemplate = tableCreater.getCellTemplateNodeOfOriginalRow(table, rowIndex, col.index(), tableCreater.editorTemplateTagName);

        if (typeof (resultTemplate) === "undefined") {
            resultTemplate = tableCreater.getTemplateAttribute(table, rowIndex, col.index(), tableCreater.editorTemplateAttrName);
        } else { //get editor template success
            resultTemplate = resultTemplate.html();
            shouldChangeToHTMLExpression = true;
        }
        if (typeof (resultTemplate) === "undefined" || tableCreater.isColReadOnly(table, col.index(), action)) {
            resultTemplate = tableCreater.getCellTemplate(table, rowIndex, col.index());
            if (resultTemplate && (resultTemplate instanceof jQuery)) { //get td node it self success
                resultTemplate = tableCreater.changeTag(resultTemplate, "div", true);
                shouldChangeToHTMLExpression = true;
            }
        }
        if (shouldChangeToHTMLExpression) {
            resultTemplate = tableCreater.templatePreFix_HTML + " " + resultTemplate;
        }
        return resultTemplate;
    },

    createCRUDEditor: function (table, action) {
        var c = ko.bindingHandlers.tableCRUD.crudActionTypes;
        switch (action) {
            case c.add:
            case c.change:
                var head = $(table).children("thead");
                var form = $("<form />").addClass("form-horizontal");

                var cols = head.children("tr").first().children();
                for (var i = 0; i < cols.length; i++) {
                    if (!tableCreater.isColEditableShown(table, i, action)) {
                        continue;
                    }
                    var template = tableCreater.getCellEditorTemplate(cols[i], action, table);
                    if (typeof (template) === "undefined") continue;

                    var group = $("<div/>").addClass("control-group");
                    var label = $(cols[i]).attr("editorLabel");
                    if (!label) {
                        label = $(cols[i]).html();
                    }
                    group.append($("<label/>").addClass("control-label").html(label));
                    var controlDiv = $("<div/>").addClass("controls").append(tableCreater.createCRUDFieldEditor(template, action, tableCreater.isColReadOnly(table, i, action)));
                    group.append(controlDiv);
                    form.append(group);
                }
                return form;
            case c['delete']:
                return $("<p>" + tableResource.DelConfirm + "</p>");
            default:
                throw "Not supported action";
        }
    },

    getCellDataItemProperty: function (cellTd) {
        cellTd = $(cellTd);
        return tableCreater.getTemplateAttribute(cellTd.parents("table"), cellTd.parent("tr").index(), cellTd.index(), tableCreater.dataItemPropertyAttrName);
    },

    getCellOrderField: function (tdOrTh) {
        tdOrTh = $(tdOrTh);
        if (tdOrTh.prop("tagName") !== "TD" && tdOrTh.prop("tagName") !== "TH") {
            throw "should be TD or TH";
        }
        var field = tableCreater.getTemplateAttribute(tdOrTh.parents("table"), 0, tdOrTh.index(), tableCreater.orderFieldAttrName);
        if (!field) {
            field = tableCreater.getCellDataItemProperty(tdOrTh);
        }
        return field;
    },

    isCellOrderable: function (tdOrTh) {
        if (typeof (tdOrTh.parents("table").attr(tableCreater.notOrderAttName)) !== "undefined") {
            return false;
        }
        var notOrder = tableCreater.getTemplateAttribute(tdOrTh.parents("table"), 0, tdOrTh.index(), tableCreater.notOrderAttName);
        return typeof (notOrder) === "undefined";
    },

    getPagingInformation: function (from, to, total) {
        return "Showing " + from + " to " + to + " of " + total + " entries";
    },

    createPagingInfoPanel: function (pagingInfoContainerName) {
        var html =
                "<div class='col-sm-6'>" +
                "    <div name='" + pagingInfoContainerName + "' class='dataTables_info'></div>" +
                "</div>";
        return html;
    },

    createPagingNavigatePanel: function (pagingNavigateContainerName) {
        return "<div class='col-sm-6'>" +
            "       <div name='" + pagingNavigateContainerName + "'>" +
            "       </div>" +
            "   </div>";
    },

    createPagingNavigateIndex: function (pageIndex, currentPageIndex, navFunction) {
        var li = $("<li><a>" + (pageIndex + 1) + "</a></li>");
        var a = li.children("a");
        if (currentPageIndex === pageIndex) {
            li.addClass(tableCreater.currentNavigateIndexClass);
        }
        a.on("click", function (event) {
            navFunction(pageIndex);
        });
        return li;
    },

    firstNavigateIndexClass: "prev",
    lastNavigateIndexClass: "next",
    currentNavigateIndexClass: "active",

    createFirstPageIndex: function (currentPageIndex, navFunction) {
        var firstPageli = $('<li><a href="#">&laquo;</a></li>');
        firstPageli.addClass(tableCreater.firstNavigateIndexClass);
        if (currentPageIndex <= 0) {
            firstPageli.addClass("disabled");
        }
        firstPageli.children("a").on('click', function (event) {
            navFunction(0);
        });
        return firstPageli;
    },

    createLastPageIndex: function (currentPageIndex, totalPagesCount, navFunction) {
        var lastPageLi = $('<li><a href="#">&raquo;</a></li>');
        lastPageLi.addClass(tableCreater.lastNavigateIndexClass);
        if (currentPageIndex >= totalPagesCount - 1) {
            lastPageLi.addClass("disabled");
        }
        lastPageLi.children("a").on('click', function (event) {
            navFunction(totalPagesCount - 1);
        });
        return lastPageLi;
    },

    createPagingNavigateContent: function (currentPageIndex, totalPagesCount, itemsCountOnePage, maxIndexCount, attachData) {
        var ul = $("<ul class='dataTables_paginate paging_bootstrap pagination' />");
        var navFunction = function (index) {
            (ko.utils.unwrapObservable(attachData.bindingData.fetchItems))(ko.utils.unwrapObservable(attachData.bindingData.fetchUrl), index);
        };
        ul.append(tableCreater.createFirstPageIndex(currentPageIndex, navFunction));
        var firstIndexPage = currentPageIndex - parseInt(maxIndexCount / 2, 10);
        if (firstIndexPage < 0) {
            firstIndexPage = 0;
        } else {
            if (firstIndexPage + maxIndexCount >= totalPagesCount) {
                firstIndexPage = totalPagesCount - maxIndexCount;
                if (firstIndexPage < 0) {
                    firstIndexPage = 0;
                }
            }
        }
        for (var i = 0; i < maxIndexCount; i++) {
            if (firstIndexPage + i >= totalPagesCount) {
                break;
            }
            ul.append(tableCreater.createPagingNavigateIndex(firstIndexPage + i, currentPageIndex, navFunction));
        }
        ul.append(tableCreater.createLastPageIndex(currentPageIndex, totalPagesCount, navFunction));
        return ul;
    }
});

var tableHelper = {
    Buttons: {
        Ok: 'OK',
        Yes: 'YES',
        No: 'NO',
        Cancel: 'CANCEL'
    },
    //messageBox: undefined //function(text, title, buttons, closedCallback)
    convertToPixelValue: function (valueWithUnit) {
        if (valueWithUnit === parseFloat(valueWithUnit)) {
            return parseFloat(valueWithUnit);
        }
        if (!valueWithUnit.match("px$")) {
            //becase scrollHeight is px, and if max-height is not px, we don't know how to convert other unit (em, % and so on) to px
            //in the furture, if we know the method, then we can convert it to px and won't throw any exception
            throw "max-height other than px unit is not supported yet";
        }
        return parseFloat(valueWithUnit);
    }
};

var tableResource = {
    Ok: 'OK',
    Cancel: 'Cancel',
    Add: 'Add',
    Change: 'Edit',
    'Delete': 'Delete',
    SaveChanges: 'Save All Changes',
    DelConfirm: 'Are you sure you want to delete selected row(s)?',
    OnlyOneRowSelect: 'Only one row can be selected at any time!',
    NoRowSelectEdit: 'Please select the row that you want to edit!',
    NoRowSelectDel: 'Please select the row that you want to delete!'
};

var tableInlineEditHandlerClass = function () {
    var self = this;
    this.handlers = [];
    this.registerHandler = function (selector, processFunction) {
        var h = self.getHandler(selector);
        if (h) {
            h.processFunction = processFunction;
            return;
        }
        self.handlers.push({ selector: selector, processFunction: processFunction });
    };
    this.getHandler = function (selector) {
        for (var i = 0; i < self.handlers.length; i++) {
            if (self.handlers[i].selector == selector) {
                return self.handlers[i];
            }
        }
        return undefined;
    };
    this.getHandlerForEditor = function (editor, onlyLatest) {
        if (typeof (onlyLatest) === "undefined") {
            onlyLatest = true;
        }
        var hs = [];
        editor = $(editor);
        for (var i = 0; i < self.handlers.length; i++) {
            if (editor.filter(self.handlers[i].selector).length > 0) {
                hs.push(self.handlers[i].processFunction);
            }
        }
        if (hs.length > 0) {
            if (onlyLatest) {
                return hs[hs.length - 1];
            } else {
                return hs;
            }
        } else {
            return undefined;
        }
    }
};

var tableInlineEditFinishHandler = new tableInlineEditHandlerClass();

tableInlineEditFinishHandler.registerHandler("", function ($currentCell, $editor, $endEdit) {

});

var tableInlineEditAfterEditorAppendInHtmlHandler = new tableInlineEditHandlerClass();
tableInlineEditAfterEditorAppendInHtmlHandler.registerHandler("", function ($currentCell, $editor, $endEdit) {

});

