/*
    IllustratorTagEditor.jsx



*/

#include "../Pslib.jsx";
#include "../jsui.js";

#target illustrator;

if(app.documents.length)
{
    Main();
}

function Main()
{
    // alert( "Hello, this is tag editor!" );
    var doc = app.activeDocument;
    var selection = doc.selection;
    var itemFound = false;

    if(selection.length)
    {
        var item = selection[0];
    
        if(item.typename == "PathItem")
        {
            itemFound = true;
            showUI(item);
        }
        else
        {
            itemFound = getPlaceholderItem();
            if(itemFound) Main();
        }
        // else 
        // {
        //     alert("Select a \"#\" PathItem and try again.");
        // }
    }
    else
    {
        // if no selection active, look for placeholder # item, select it, and restart process
        itemFound = getPlaceholderItem();
        if(itemFound) Main();
    }

    if (!itemFound)
    {
        doc.selection = selection;
        alert("Select a \"#\" PathItem and try again.");
    }
}

// select first "#" PathItem if found on current artboard
function getPlaceholderItem( artboard )
{
    if(!artboard) { var artboard = JSUI.getActiveArtboard(); }

    var placeholder;
    var found = false;
    var doc = app.activeDocument;
    doc.selectObjectsOnActiveArtboard();
    var selection = doc.selection;

    if(selection.length)
    {
        for (var i = 0; i < selection.length; i++)
        {
            var item = selection[i];

            // if artboard has only one item, and item is a group
            if( i == 0 && selection.length == 1 && item.typename == "GroupItem")
            {
                // enter isolation mode
                item.isIsolated = true;
                var groupItems = item.pageItems;
                for (var j = 0; j < groupItems.length; j++)
                {
                    var subItem = groupItems[j];
                    if(subItem.name == "#")
                    {
                        placeholder = subItem;
                        found = true;
                        doc.selection = subItem;
                        break;
                    }
                }

                // exit isolation mode
                item.isIsolated = false;
            }

            else if(item.name == "#")
            {
                placeholder = item;
                found = true;
                doc.selection = item;
                break;
            }
        }
    }
    return placeholder;
}

function showUI(item)
{
    var doc = app.activeDocument;
    var item = item;
    var artboard = JSUI.getActiveArtboard();
    var artboardIndex = doc.artboards.getActiveArtboardIndex();
    var artboardName = artboard ? artboard.name : "";

    var tags = Pslib.scanItemsForTags( [item], "PathItem" )[0];

    var win = new JSUI.createDialog( { title: "Illustrator Item Tag Editor", orientation: "column", margins: 15, spacing: 10, alignChildren: "fill", width: 0, height: 0, debugInfo:false } );

    var documentLabel = win.addRow( { alignment: "center" });
    var itemStatus = win.addRow( { alignment: "center" });
    var itemStatusExt = win.addRow( { alignment: "center" });
    documentLabel.addStaticText( { text: "Document: " + doc.name, multiline: false, alignment: "left" } );
    itemStatus.addStaticText( { text: "Artboard #" + (artboardIndex+1) + ": " + artboardName, multiline: false, alignment: "left" } );
    itemStatusExt.addStaticText( { text: "Item: " + item.name + " (" + item.typename + ")" , multiline: false, alignment: "left" } );

    var mainContainer = win.addRow( { spacing: 10 } );

    // var updateableColumn = mainContainer.addColumn( { alignChildren: "fill" });
    // var getTagsPanel = updateableColumn.addPanel( { label: "Existing tags", width: 400, margins: 15, alignment: "fill" } );
    // var tagsColumn = getTagsPanel.addColumn( { alignment: "fill", spacing: 10 });

    var listboxColumn = mainContainer.addColumn();
    var listboxPanel = listboxColumn.addPanel( { label: "Existing tags", width: 400, margins: 15, alignChildren: "fill" } );
    listboxPanel.alignment = "fill";
    // var tagsForDisplay = [];
    // for(var i = 0; i < tags.length; i++)
    // {
    //     tagsForDisplay.push(tags[i].toString().replace(",", ":\t"));
    // }
    var tagsListbox = listboxPanel.addListBox( "tagsListbox", { list: tags, selection: 0, width: 300, height: 180, alignment: "fill" });

    ////

		// listbox callbacks
		tagsListbox.onChange = function()
		{
			if(tagsListbox.selection != null)
			{
				var splt = tagsListbox.selection.toString().split(",");
				var value = splt[1];
	
                tagNameEditText.text = splt[0];

				if(splt.length > 2)
				{
					for(var i = 2; i < splt.length; i++)
					{
						value += (i < splt.length ? "," : "")+splt[i];
					}
	
				}
				tagValueEditText.text = value;
			}
		};
		
		tagsListbox.update = function()
		{
			// store current length, selection
			var currentLength = tagsListbox.items.length;
			
			// store selected item text
			var currentSelection = tagsListbox.selection != null ? tagsListbox.selection.text : null;
	
			// // get properties from object
			var tags = tags = Pslib.scanItemsForTags(item, "PathItem")[0];
			
			// remove items from list
			tagsListbox.removeAll();
			
			if(tags.length)
			{
				for(var j = 0; tagsListbox.items.length < tags.length; j++)
				{  
					var item = tagsListbox.add ("item", tags[j].toString());
								
                    if(currentSelection != null)
                    {
                        if(item.text == currentSelection)
                        {
                            tagsListbox.selection = item;
                        }
                        else if(tagsListbox.items.length > currentLength)
                        {
                            tagsListbox.selection = tagsListbox.items[tags.length-1];
                        }
                    }
                }
                tagsListbox.onChange();
			}
		};
	
    /////

    var editColumn = mainContainer.addColumn( { spacing: 10 });
    var setTagsPanel = editColumn.addPanel( { label: "Edit tag", alignment: "fill", margins: 15} );



    // var currentTagsList = getTagsPanel.addEditText("undefined", { text: tagsStr, readonly: true, multiline: true, width: 300, height: 200 });
    
    // var getTagsBtn = getTagsPanel.addButton( { label: "Scan" });

    var nameRow = setTagsPanel.addRow( { alignment: "right", spacing: 0} );
    var tagNameEditText = nameRow.addEditText("undefined", { label: "Name:", characters: 30 });
    tagNameEditText.onChanging = function(){}; // make sure JSUI does not track the value for these
    tagNameEditText.onChanged = function(){};
    
    var valueRow = setTagsPanel.addRow( { alignment: "right", spacing: 0} );
    var tagValueEditText = valueRow.addEditText("undefined", { label: "Value:", characters: 30 });
    tagValueEditText.onChanging = function(){}; // make sure JSUI does not track the value for these
    tagValueEditText.onChanged = function(){};

    // update edittext values
    if(tagsListbox.selection!=null)
    {
        var splt = tagsListbox.selection.toString().split(",");
        tagNameEditText.text = splt[0];
        tagValueEditText.text = splt[1];
    }

    // formatting happens here
    // formatTagsForUIPresentation(tags, tagsColumn, tagNameEditText, tagValueEditText);

    var setremoveRow = setTagsPanel.addRow( { spacing: 10 });
    // var setTagsBtn = setremoveRow.addButton( { label: "Set" });
    var setTagslbBtn = setremoveRow.addButton( { label: "Set" });
    var removeTagsBtn = setremoveRow.addButton( { label: "Remove" });

    var advancedOptionsPanel = editColumn.addPanel( { label: "Advanced", orientation: "row", spacing: 10, alignment: "fill", margins: 15} );
    var clearAllTagsBtn = advancedOptionsPanel.addButton( { label: "Clear All" });
    // var moreOptionsBtn = advancedOptionsPanel.addButton( { label: "More Options..." });
    // function clearSelectedTags(){};
    // var clearSelectedTagBtn = clearTagsPanel.addButton( { label: "Clear Selected", onClickFunction:function clearSelectedTags(tagNameEditText, tagValueEditText){ alert("Ahiiii!" + tagNameEditText.text + ": " + tagValueEditText.text);} }); // clearSelectedTags is replaced further down
    // 
    // function updateTags(){}

    // getTagsBtn.onClick = function ()
    // {
    //     var tags = Pslib.scanItemsForTags(item)[0];
        
    //     if(tags.length)
    //     {
    //         // currentTagsList.text = str; 
    //         // formatTagsForTextPresentation(tags);
    //         formatTagsForUIPresentation(tags, tagsColumn, tagNameEditText, tagValueEditText);
    //     }
    // } 

    // function restartUI(item, dialog)
    // {
    //     // win.close();
    //     showUI(item, dialog);
    // }

    setTagslbBtn.onClick = function ( )
    {
        // get values
        var name = tagNameEditText.text.trim();
        var value = tagValueEditText.text.trim();

        if(name != "")
        {
            // expects [ ["name", "value"], ["name", "value"]]
            Pslib.setTags( item, [ [ name, value ] ] );
            tagsListbox.update();
        }
    }

    // setTagsBtn.onClick = function ( )
    // {
    //     // get values
    //     var name = tagNameEditText.text.trim();
    //     var value = tagValueEditText.text.trim();

    //     if(name != "")
    //     {
    //         // expects [ ["name", "value"], ["name", "value"]]
    //         Pslib.setTags( item, [ [ name, value ] ] );

    //         // refresh UI
    //         // getTagsBtn.onClick();

    //         // restart
    //     // win.close();
    //     // showUI();

    //     // restartUI(item, win);
    //         // win.show();
    //         // var parent = updateableColumn.parent;
    //         // win.remove(updateableColumn);


    //         //  updateableColumn = mainContainer.addColumn();
    //         //  getTagsPanel = updateableColumn.addPanel( { label: "Existing tags", width: 400, margins: 15, alignment: "fill" } );
    //         //  tagsColumn = getTagsPanel.addColumn( { alignment: "fill", spacing: 10 });

    //         //getTagsPanel = mainContainer.addPanel( { label: "Existing tags", width: 400, margins: 15, alignment: "fill" } );
    //         // tagsColumn = getTagsPanel.addColumn( { alignment: "fill" });
    //         // tagsColumn = parent.addColumn( { alignment: "fill" });

    //         // var tagsColumn = getTagsPanel.addColumn( { alignment: "fill" });
    //         // tags = Pslib.scanItemsForTags(item, "PathItem")[0];

    //         // formatTagsForUIPresentation(tags, tagsColumn, tagNameEditText, tagValueEditText);

            
    //         // tagsColumn.show();

    //         // formatTagsForUIPresentation(Pslib.scanItemsForTags(item, "PathItem")[0], tagsColumn);
    //         // updateTags();
    //         // win.show();

    //         // showUI();

    //     }
    // } 

    removeTagsBtn.onClick = function ( )
    {
        var name = tagNameEditText.text.trim();
        if(name != "")
        {
            Pslib.removeTags( item, [ name ]  );
            tagsListbox.update();

            tagNameEditText.text = "";
            tagValueEditText.text = "";
            // win.close();
            // showUI();
        }
    }

    // function updateTags()
    // {
    //     var tags = Pslib.scanItemsForTags(item, "PathItem")[0];
    //     formatTagsForUIPresentation(tags, tagsColumn, tagNameEditText, tagValueEditText);
    // }


    // clearTagsBtn.onClick = function (item)
    clearAllTagsBtn.onClick = function (  )
    {
        Pslib.removeAllTags(item);
        tagsListbox.update();
        // currentTagsList.text = "";
        // win.close();
        
    } 

    win.addCloseButton();
    win.show();
}

// function formatTagsForTextPresentation( tags )
// {
//     var str = "";

//     if(tags.length)
//     {
//         for(var i = 0; i < tags.length; i++)
//         {
//             var tag = tags[i]; 
//             str += ((i==0?"":"\n") + tag[0] + ": " + tag[1]);
//         }
//     }

//     return str;
// }

// function formatTagsForUIPresentation( tags, container, nameEditT, tagEditT )
// {
//     if(tags.length)
//     {
//         var rows = [];
//         var buttons = [];
//         var values = [];

//         // add rows
//         for(var i = 0; i < tags.length; i++)
//         {
//             rows.push( container.addRow( { alignment: "fill", spacing: 10 }) );
//         }

//         for(var i = 0; i < tags.length; i++)
//         {
//             var tag = tags[i];
            
//             // namesCol.addEditText("undefined", {text: tag[0], readonly: true, multiline: false, characters: tag[0].length });
//             // nasty hack: using helptip property to pass info, haha.

//             buttons.push( rows[i].addButton( { label: tag[0], width: 150, helpTip:tag[1], onClickFunction: function(){ nameEditT.text = this.label; tagEditT.text = this.helpTip; /*alert( "helpTip: " + this.helpTip + "\nvaluesArr: " + values[i] )*/ }, alignment: "left" } ) );

//             // valuesCol.addEditText("undefined", {text: tag[1], readonly: true, multiline: false, characters: tag[1].length });
//             values.push( rows[i].addEditText("undefined", { text: tag[1], readonly: true, multiline: false, characters: 30, alignment: "right" }) );
//         }
//         // activate first button
//         buttons[0].onClick();
//         buttons[0].active = true;
//     }
// }


