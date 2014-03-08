binding format
data-bind = "table: {
    source: ***, //a collection that contains all the data items to be shown
    multiRowSelected: boolean, //a boolean indicate if support select multi rows, default is false
    selectMode: ko.bindingHandlers.table.selectMode.rowSelect or ko.bindingHandlers.table.selectMode.cellSelect, default is ko.bindingHandlers.table.selectMode.rowSelect
    onRowClick: *** //a function, (event, dataItme) that will be called when user click on the tr element, the first element is the event object and the second object is the data item of this tr 
    orders: observableArray, an array indicate the current ordered header, each element has two properties, {field: string, asc: bool}, field indicate order by which field, 
             it's the value of the header attribute order-field (if not provided, then dataItemProperty will be used),
             asc: indicate if the order is asc or desc, when user click on any header to order, it will changed
}"

table element has the attach data which is 
{
    originalRows: ***, //the original rows in the table body, these will be used as row template
    tableBindingData: *** //the current binding data (not ko bindingContext)
    selectedItems: observable array, this is for tableSelectedItems binding, the table binding and tableSelectedItems binding share same attach data on the same table element
    relatedCRUDDatas: [] or undefined, all the crud attach data the targetTable of which is this table
}

tr element has the attach data which is
{
    isSelected: ***(boolean) // indicate if current row is selected or not
    dataItem: *** // is the data that is bound to this tr
    isFocus: *** boolean
}

for tr, there is a new binding isSelected which can bound the row selected status to the property of the viewModel
data-bind = "isSelected: ***"

for td, the attach data is:
{
     isSelected: boolean
     isFocus: boolean,
     isInlineEditing: boolean,
     inlineEditorDiv: the div that directly contains the inline editor
}


for table crud panel
data-bind = "tableCRUD: {
    forTableSelector: which table, this crud panel is for, this is the selector sting of the table, if not present, the nearest table PARENT is used
    actionButtons: []// is a array of ko.bindingHandlers.tableCRUD.crudActionTypes, indicate which kind of buttons should be included, if undefined, then all button will be included
                    default is [ko.bindingHandlers.tableCRUDcrud.ActionTypes.add, ko.bindingHandlers.tableCRUDcrud.ActionTypes.change, ko.bindingHandlers.tableCRUD.crudActionTypes['delete']]
                    if the target table bind set editMode to ko.bindingHandlers.table.editMode.inline, then for the default, ko.bindingHandlers.tableCRUD.change is not included
    addBtnSelector/delBtnSelector/changeBtnSelector/saveBtnSelector: indicate which button is for which function
    addEditorSelector/delEditorSelector/changeEditorSelector: indicate which will be shown as modal when create a new item, please note, only the editor it content should be speficy, the tableCRUD will create OK and cancel button automatilly
    newItem: function(), a function will create a new data item
    saveFunc: ** the function will be called when user click save button, it should check all items status and save all changed items
    dataItemVerify: function(dataItem, action, editorContent, editorModalDialog, [dataItemProperty]):boolean, 
                    the first param is the data item that currently editing
                    the second param is the current edit action (ko.bindingHandlers.tableCRUD.crudActionTypes.add/change/delete)
                    the third param is the jquery object for the editor content html element
                    the fourth param is the jquery modal dialog html element
                    the result is the verify result, it should be a boolean, if the result is false, the edite(add/change/del) will be cancel
                    the property of the dataItem that is editing, only when inline edit mode, and there is a attribute of dataItemProperty on the td in a tr template or th in the tr of thead
                    if dataItem and action is undefined, then it means should verify all the items
    copyDataItem: function(dataItem): copied data item. this fun is called when we change a data item, first , call it to get a temp data item,and bind it to the editor, then
                  user can edit the temp date item from editor, after user click ok button to confirm, we call assignDataItem to copy the data back to the origianl edit target
    assignDataItem: function(editedDataItem, targetDataItem) see above infromation
    saveImmediately: boolean // default is true, if this is true, once the edit method(add/change/del) is called, and user confirmed, the saveFunc will be called at once,
                             // if it is false, then the saveFunc will not be called, they just in the memory of client browser, and only user click save button on crud panel, the saveFunc will be called
    editMode: //ko.bindingHandlers.tableCRUD.editMode.modalPopup, ko.bindingHandlers.tableCRUD.editMode.inline
              //if is modalPopup, then there will be a modal dialog popup when user click change button
              //if is inline, then when user "type"/"click" on a cell the cell will be change to the corresponding editor, for default, there is no change button will be shown
              //default value is ko.bindingHandlers.tableCRUD.editMode.modalPopup
    newEditMode: //ko.bindingHandlers.tableCRUD.editMode.modalPopup, ko.bindingHandlers.tableCRUD.editMode.inline
              //if is modalPopup, then there will be a modal dialog popup when user click new button
              //if is inline, then when user create a new item, a new empty row is added, and user can "type"/"click" on a cell the cell of the new row will be change to the corresponding editor
              //default value is undefined
              //if it is undefined, then will use editMode value
    beforeShowEditor: function(action, modalContent, targetDataItem) //this function will be called before the editor is shown, 
                //action: ko.bindingHandlers.tableCRUD.crudActionTypes.add, ko.bindingHandlers.tableCRUD.crudActionTypes.change or ko.bindingHandlers.tableCRUD.crudActionTypes['delete']
                //modalContent: is the editors container html node
                //targetDataItem: is the dataitem currently being edited
    prepareCRUDModal: function (action, modalRoot, modalContent, okBtn, cancelBtn, targetDataItem)
                //this function is just called after the  tableCreater.prepareCRUDModal is called
                //at this time, the crud modal is created and almost propared, it can be shown now, but we give a second chance to make some minior or any changes to the modal ui
                //use this if you have any special requires to the UI (please note, this function should be used for UI changeds at most time)
                //parameters:
                //action: ko.bindingHandlers.tableCRUD.crudActionTypes.add/ko.bindingHandlers.tableCRUD.crudActionTypes.change/ko.bindingHandlers.tableCRUD.crudActionTypes['delete']
                //modalRoot: the jquery object of the root element of the Modal
                //modalContent: the jquery object of the content element of the Modal (of course it is the children of the modalRoot and if addEditorSelector/delEditorSelector/changeEditorSelector provided, it is the clone of the element jquery object selected by these selector)
                //okBtn,cancelBtn
                //targetDataItem: although it has same properties values as the current edit data item, but actual it is the cpoied of the data item, but this targetDataItem is the actual one that is bound to Modal
}
the crud element (any html node that can have children nodes) has the attach data which is
{
    bindingData: *** //the current binding data (not ko bindingContext),
    targetTable: *** //the table the crud panel is for
    bindingContext: *** // the binding context
    viewModel: *** //the view model that the element is bound to
}
to use crud binding, you can custom the editor by the two ways:
1. create each field editor on the tr of header section of the table
2. create each field editor on the tr of the tboday of the table
for example:
<!--
<table id="vesselInstanceTable" data-bind="table: { source: oDataItems.items }">
    <thead>
        <tr>
            <th cellTemplate="InstanceNo" notEdit="notEdit" notAdd="notAdd" dataItemProperty="InstanceNo" order-field="InstanceNo">
                <div>#</div>
            </th>
            <th cellTemplate="Name" dataItemProperty="Name" order-field="Name"
                editortemplate="HTML: (-|input type='text' data-bind='{value:Name}' class='validate[required]' /|-)">
                <div>The Name</div>
            </th>
            <th cellTemplate="IMO" notEdit="READONLY" notOrder="notOrder"
                editortemplate="HTML: (-|input type='text' data-bind='{value:IMO}' class='validate[required,custom[imo]]' /|-)">
                <div>IMO</div>
            </th>
            <th cellTemplate="BIND: format:{value:StartDate,formatStr:'@Context.CurrentGlobalFormat().ShortDateFormat',dateType:ko.bindingHandlers.format.dataTypes.dateTime}"
                    notEdit="READONLY"
                    editorLabel="@VesselInstanceRes.StartColHeader (@Context.CurrentGlobalFormat().ShortDateFormat.ToUpper())"
                    editorTemplate="HTML: (-|input type='text' data-date-format='@globalFormat.ShortDateFormat' data-bind='datetimepicker:{datetime:StartDate}' class='validate[required,custom[cultureDate[@Context.CurrentGlobalFormat().ShortDateFormat]],custom[cultureDateFuture[@Context.CurrentGlobalFormat().ShortDateFormat,2010-01-01]]]' /|-)">
                    editorFinishEvent="blur"
                    editorFinish="some code to trigger the finish edit"
                <div>Start Date</div>
            </th>
        </tr>
    </thead>
<table>
or
<table id="vesselInstanceTable" data-bind="table: { source: oDataItems.items }">
    <thead>
    ...
    </thead>
    <tbody>
        <tr>
            <td data-bind="text:Name" dataItemProperty="Name" order-field="Name"/>
            <td cellTemplate="InstanceNo" notEdit="notEdit" notAdd="notAdd"/>
            <td cellTemplate="Name" editortemplate="HTML: (-|input type='text' data-bind='{value:Name}' class='validate[required]' /|-)"
                editorFinishEvent="blur"
                editorFinish="some code to trigger the finish edit"/>
        </tr>
    </tbody>
<table>
-->
Explain:
you can add addition attributes on both td or th
The additional attributes can be:
  cellTemplate: it can be plain text (means display the property of data item as string), a string which starts with "BIND: "(means the cell display as an td with the data-bind)
                or a string with "HTML: " (the cell is represent by the html), see function tableCreater.createCellTemplate
  notEdit notAdd notEdit="READONLY" or notAdd="READONLY":
                //notAdd="notAdd" means is not visible for add, and ofcourse is readonly
                //notAdd="READONLY" means is shown on add, but is readonly
                //notEdit="notEdit" means is not visible for change, and ofcourse is readonly
                //notEdit="READONLY" means is shown on change, but is readonly
                see function tableCreater.isColEditableShown and tableCreater.isColReadOnly
  editorTemplate: if provide, then use it as the editor when add or change a data item, otherwise use cellTemplate as the editor, the value of it is used in the same way as cellTemplate
  editorLabel: if proviedd, use it as the label before the editor, otherwise use the col header
  dataItemProperty: a plain text which is the name of the property of the data item. it is only used in inline model, in inline, when user change a cell, the bound item property will be changed also
                 becasue of the bound, but for the situation that the dataItemVerify is not pass, we need to revert user changes, so before user change, we copied the data item
                 and when dataItemVerify fail, we copy the property (specified by dataItemProperty) of the copied data item back to the data item. 
                 if this is not provied, the code will copy every properties of the copied data item to the data item
  editorFinishEvent: if not provided, then blur will be used, that is to say, when the editor lost focus, the cell will finish the edit, it can be any event name, for example: click and so on
  editorFinish: if provide, the every time, the editor is created, this code will be used to register the event, used can write code to check if should end cell edit,
                for example, 
                  if($currentCell.index() == 5){
                    $editor.blur(function(){
                      $endEdit();
                    })
                  };
  order-field: indicate when user click on this header column, which field name should be used to order, when user click on the header, a new item {field: order-field value, ase: true or false}
                will be added to the table binding orders array
  notOrder: normally, if the column provide order-field or dataItemProperty, then it will be able ordered by default, in case user provide dataItemProperty and not want it order able, then add notOrder="notOrder" to disable order function for this column
            if notOrder="notOrder" is added to table, then the whole order function will be disabled

for table paging binding
data-bind="tablePaging:{
  pageInfoContainerSelector:
  pageNavigateContainerSelector:
  totalCount: total record items count
  onePageItemsCount: record itmes count on one page
  currentPageIndex: int
  fetchUrl:  the url will passed to fetchItems function, if it is not provied, then the pageIndex will be the first param to the fetchItems function
  fetchItems: the function(fetchUrl, pageIndex, fetchFinishedCallback) that update the items, when user click on any page index, this function will be called, the first and last params is not required
}"

the page element has the following attachdata
{
    bindingData: *** //the current binding data (not ko bindingContext),   
}

data-bind= tableSelectedItems :// items (array or observableArray)in the source, which is bound for the current selected rows
the table binding and tableSelectedItems binding share same attach data on the same table element