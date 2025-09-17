$('#tree-container').jstree({ core: { data: [], themes: { name: 'default-dark' } }, plugins: ['search','themes','wholerow'] });

function preprocessXmlInput(xmlText) {
    return xmlText.replace(/<\?xml.*?\?>\s*/gi,'').replace(/<!DOCTYPE[^>]*>\s*/gi,'');
}

function convertToJSTreeData(obj, parentKey='') {
    if(typeof obj !== 'object' || obj === null)
        return [{ text: `${parentKey}: ${obj}` }];
    if(Array.isArray(obj))
        return obj.map((item, index) => ({
            text: `${parentKey}[${index}]`,
            children: convertToJSTreeData(item, '')
        }));
    return Object.keys(obj).map(key => ({
        text: key,
        children: convertToJSTreeData(obj[key], key)
    }));
}

function convertXmlToJSTreeData(xmlNode) {
    let children = [];
    if(xmlNode.attributes)
        for(let attr of xmlNode.attributes)
            children.push({ text: `@${attr.name}: ${attr.value}` });
    for(let child of xmlNode.childNodes){
        if(child.nodeType === 1)
            children.push({ text: child.nodeName, children: convertXmlToJSTreeData(child) });
        else if(child.nodeType === 3) {
            let text = child.nodeValue.trim();
            if(text)
                children.push({ text });
        }
    }
    return children;
}

function applyTheme(isDark) {
    if(isDark) {
        $('body').removeClass('light-theme');
        $('#tree-container').jstree(true).settings.core.themes.name='default-dark';
    } else {
        $('body').addClass('light-theme');
        $('#tree-container').jstree(true).settings.core.themes.name='default';
    }
    $('#tree-container').jstree(true).refresh();
}

$('#theme-toggle').on('change', function() {
    applyTheme(this.checked);
});

$('#expand-all').on('click', () => $('#tree-container').jstree('open_all'));
$('#collapse-all').on('click', () => $('#tree-container').jstree('close_all'));

$('#view-select').on('change', function() {
    handleInput();
});

$('#menu-toggle').on('click', function() {
    $('.nav-controls').toggleClass('show');
});

$('#sample-json').on('click', () => {
    $('#json-input').val('{"name":"John","age":30,"city":"New York"}').trigger('input');
});

$('#sample-xml').on('click', () => {
    $('#json-input').val('<person><name>John</name><age>30</age><city>New York</city></person>').trigger('input');
});

let debounceTimer = null;
$('#json-input').on('input', function() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(handleInput, 200);
});

function handleInput() {
    const inputText = $('#json-input').val();
    const viewType = $('#view-select').val();
    const $notification = $('#notification');
    const $status = $('#format-status');
    try {
        let data = [];
        if(viewType === 'json') {
            const jsonData = JSON.parse(inputText);
            data = convertToJSTreeData(jsonData);
            $status.text('✅ Valid JSON format');
        } else if(viewType === 'xml') {
            const cleanedInput = preprocessXmlInput(inputText);
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(cleanedInput, 'application/xml');
            if(xmlDoc.getElementsByTagName('parsererror').length > 0)
                throw new Error('Invalid XML');
            data = [{
                text: xmlDoc.documentElement.nodeName,
                children: convertXmlToJSTreeData(xmlDoc.documentElement)
            }];
            $status.text('✅ Valid XML format');
        }
        $('#tree-container').jstree(true).settings.core.data = data;
        $('#tree-container').jstree(true).refresh();
        $notification.hide();
    } catch(e) {
        $('#tree-container').jstree(true).settings.core.data = [];
        $('#tree-container').jstree(true).refresh();
        $notification.show();
        $status.text('❌ Invalid input format');
        setTimeout(() => $notification.hide(), 3000);
    }
}

$('#search-node').on('keyup', function() {
    const query = $(this).val();
    $('#tree-container').jstree('search', query);
});

function generateTreeText(node, depth = 0) {
    let result = `${'  '.repeat(depth)}- ${node.text}\n`;
    if(node.children)
        for(let child of node.children)
            result += generateTreeText(child, depth + 1);
    return result;
}

$('#download-btn').on('click', () => {
    const treeData = $('#tree-container').jstree(true).get_json('#', {flat: false});
    let textOutput = '';
    treeData.forEach(rootNode => textOutput += generateTreeText(rootNode));
    const blob = new Blob([textOutput], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tree-structure.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});
