
let table = {
    dataModel: [
        {
            columnName: "height",
            dataType: "number"    
        }
    ]
}

let modelValues = [
    {
        columnName: "weight",
        dataType: "number",
    },
    {
        columnName: "height",
        dataType: "number"    
    }
];

for (modelValue of modelValues) {
    if (table.dataModel.some(o => o.columnName === modelValue.columnName)) {
        console.log(modelValue.columnName + " alter");
    } else {
        console.log(modelValue.columnName + " create");
    }
}