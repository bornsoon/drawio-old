/**
 * Copyright (c) 2006-2019, JGraph Ltd
 * Copyright (c) 2006-2019, draw.io AG
 */
// null'ing of global vars need to be after init.js
window.VSD_CONVERT_URL = null;
window.EMF_CONVERT_URL = null;
window.ICONSEARCH_PATH = null;

// Properties Panel Plugin - UI가 완전히 로드된 후 실행
window.addEventListener('load', function() {
    // Draw 객체가 정의될 때까지 대기
    function waitForDraw() {
        if (typeof Draw !== 'undefined' && typeof Draw.loadPlugin === 'function') {
            Draw.loadPlugin(function(ui) {
                
                // 속성창 컨테이너 생성
                var propertiesPanel = document.createElement('div');
                propertiesPanel.style.background = '#ffffff';
                propertiesPanel.style.border = '1px solid #ccc';
                propertiesPanel.style.borderRadius = '4px';
                propertiesPanel.style.position = 'fixed';
                propertiesPanel.style.padding = '15px';
                propertiesPanel.style.width = '300px';
                propertiesPanel.style.height = '400px';
                propertiesPanel.style.top = '80px';
                propertiesPanel.style.right = '20px';
                propertiesPanel.style.overflowY = 'auto';
                propertiesPanel.style.zIndex = '1000';
                propertiesPanel.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
                propertiesPanel.style.fontFamily = 'Arial, sans-serif';
                propertiesPanel.style.fontSize = '12px';
                
                var graph = ui.editor.graph;
                
                // Chromeless 모드가 아닌 경우 위치 조정
                if (!ui.editor.isChromelessView())
                {
                    propertiesPanel.style.top = '100px';
                    propertiesPanel.style.right = '280px';
                }
                
                // 초기 메시지
                propertiesPanel.innerHTML = '<h3 style="margin:0 0 10px 0;color:#666;">Properties</h3><p style="color:#999;font-style:italic;">도형을 선택하세요.</p>';
                document.body.appendChild(propertiesPanel);
                
                // 현재 선택된 셀 하이라이트
                var highlight = new mxCellHighlight(graph, '#00ff00', 8);
                
                // 속성 입력 필드들을 저장할 객체
                var propertyInputs = {};
                
                /**
                 * 속성창 업데이트 함수
                 */
                function updatePropertiesPanel(cell)
                {
                    // IE에서 포커스 강제 해제
                    graph.container.focus();
                    
                    // 선택된 셀이 없는 경우
                    if (cell == null)
                    {
                        highlight.highlight(null);
                        propertiesPanel.innerHTML = '<h3 style="margin:0 0 10px 0;color:#666;">Properties</h3><p style="color:#999;font-style:italic;">도형을 선택하세요.</p>';
                        propertyInputs = {};
                        return;
                    }
                    
                    // 셀 하이라이트
                    highlight.highlight(graph.view.getState(cell));
                    
                    // 속성창 내용 생성
                    var content = '<h3 style="margin:0 0 15px 0;color:#333;">Properties</h3>';
                    
                    // ID 표시
                    var cellId = cell.getId();
                    if (cellId != null)
                    {
                        content += '<div style="margin-bottom:10px;">';
                        content += '<label style="display:block;margin-bottom:5px;font-weight:bold;color:#555;">ID:</label>';
                        content += '<input type="text" value="' + cellId + '" readonly style="width:100%;padding:5px;border:1px solid #ddd;border-radius:3px;background:#f9f9f9;">';
                        content += '</div>';
                    }
                    
                    // 셀의 속성들 가져오기
                    var value = graph.getModel().getValue(cell);
                    var attrs = [];
                    
                    if (mxUtils.isNode(value))
                    {
                        attrs = value.attributes;
                    }
                    
                    // 속성 입력 필드들 생성
                    propertyInputs = {};
                    
                    // 기본 속성들
                    var defaultProps = ['label', 'tooltip', 'placeholders', 'height'];
                    
                    // 기본 속성들 표시 (편집 가능)
                    for (var i = 0; i < defaultProps.length; i++)
                    {
                        var propName = defaultProps[i];
                        var propValue = '';
                        
                        if (mxUtils.isNode(value))
                        {
                            propValue = value.getAttribute(propName) || '';
                        }
                        
                        content += createPropertyField(propName, propValue, cell);
                    }
                    
                    // 기존 속성들 표시 (기본 속성 제외)
                    for (var i = 0; i < attrs.length; i++)
                    {
                        var attrName = attrs[i].nodeName;
                        var attrValue = attrs[i].nodeValue;
                        
                        if (mxUtils.indexOf(defaultProps, attrName) < 0)
                        {
                            content += createPropertyField(attrName, attrValue, cell);
                        }
                    }
                    
                    // 새 속성 추가 버튼
                    content += '<div style="margin-top:15px;padding-top:15px;border-top:1px solid #eee;">';
                    content += '<button id="addPropertyBtn" style="background:#4CAF50;color:white;border:none;padding:8px 12px;border-radius:3px;cursor:pointer;font-size:11px;">+ Add Property</button>';
                    content += '</div>';
                    
                    propertiesPanel.innerHTML = content;
                    
                    // 새 속성 추가 버튼 이벤트
                    var addBtn = document.getElementById('addPropertyBtn');
                    if (addBtn != null)
                    {
                        addBtn.onclick = function()
                        {
                            addNewProperty(cell);
                        };
                    }
                    
                    // 기존 입력 필드들에 이벤트 추가
                    for (var propName in propertyInputs)
                    {
                        var input = propertyInputs[propName];
                        if (input != null) {
                            // 기존 이벤트 리스너 제거
                            input.onchange = null;
                            input.onblur = null;
                            
                            // 새로운 이벤트 리스너 추가
                            input.onchange = function(propName) {
                                return function() {
                                    updateCellProperty(cell, propName, this.value);
                                };
                            }(propName);
                            
                            input.onblur = function(propName) {
                                return function() {
                                    updateCellProperty(cell, propName, this.value);
                                };
                            }(propName);
                        }
                    }
                }
                
                /**
                 * 속성 필드 생성
                 */
                function createPropertyField(name, value, cell)
                {
                    var fieldId = 'prop_' + name;
                    var content = '<div style="margin-bottom:10px;">';
                    content += '<label style="display:block;margin-bottom:5px;font-weight:bold;color:#555;">' + name + ':</label>';
                    content += '<input type="text" id="' + fieldId + '" value="' + (value || '') + '" style="width:100%;padding:5px;border:1px solid #ddd;border-radius:3px;">';
                    content += '<button onclick="removeProperty(\'' + name + '\', \'' + cell.getId() + '\')" style="background:#f44336;color:white;border:none;padding:3px 6px;border-radius:2px;cursor:pointer;font-size:10px;margin-left:5px;">Remove</button>';
                    content += '</div>';
                    
                    // 입력 필드 저장 및 이벤트 리스너 추가
                    setTimeout(function()
                    {
                        var input = document.getElementById(fieldId);
                        if (input != null)
                        {
                            propertyInputs[name] = input;
                            
                            // 기존 이벤트 리스너 제거
                            input.onchange = null;
                            input.onblur = null;
                            
                            // 새로운 이벤트 리스너 추가
                            input.onchange = function(name) {
                                return function() {
                                    updateCellProperty(cell, name, this.value);
                                };
                            }(name);
                            
                            input.onblur = function(name) {
                                return function() {
                                    updateCellProperty(cell, name, this.value);
                                };
                            }(name);
                        }
                    }, 0);
                    
                    return content;
                }
                
                /**
                 * 새 속성 추가
                 */
                function addNewProperty(cell)
                {
                    var propName = prompt('속성 이름을 입력하세요:');
                    if (propName != null && propName.trim() != '')
                    {
                        propName = propName.trim();
                        
                        // 속성이 이미 존재하는지 확인
                        var value = graph.getModel().getValue(cell);
                        if (mxUtils.isNode(value) && value.getAttribute(propName) != null)
                        {
                            alert('이미 존재하는 속성입니다.');
                            return;
                        }
                        
                        // 새 속성 추가
                        updateCellProperty(cell, propName, '');
                        
                        // 속성창 새로고침
                        updatePropertiesPanel(cell);
                    }
                }
                
                /**
                 * 셀 속성 업데이트
                 */
                function updateCellProperty(cell, propName, propValue)
                {
                    graph.getModel().beginUpdate();
                    try
                    {
                        var value = graph.getModel().getValue(cell);
                        
                        // XML 노드가 아니면 생성
                        if (!mxUtils.isNode(value))
                        {
                            var doc = mxUtils.createXmlDocument();
                            var obj = doc.createElement('object');
                            obj.setAttribute('label', value || '');
                            value = obj;
                        }
                        
                        // 속성 설정
                        value.setAttribute(propName, propValue);
                        
                        // 셀 값 업데이트
                        graph.getModel().setValue(cell, value);
                        
                        // label 속성이 변경된 경우 셀 라벨도 업데이트하되, XML 속성은 유지
                        if (propName === 'label')
                        {
                            // XML 속성은 그대로 두고 셀 라벨만 업데이트
                            graph.getModel().setValue(cell, value);
                        }
                    }
                    finally
                    {
                        graph.getModel().endUpdate();
                    }
                }
                
                /**
                 * 속성 제거 (전역 함수로 등록)
                 */
                window.removeProperty = function(propName, cellId)
                {
                    var cell = graph.getModel().getCell(cellId);
                    if (cell != null)
                    {
                        var value = graph.getModel().getValue(cell);
                        if (mxUtils.isNode(value))
                        {
                            value.removeAttribute(propName);
                            graph.getModel().setValue(cell, value);
                            updatePropertiesPanel(cell);
                        }
                    }
                };
                
                // 도형 교체 기능을 위한 전역 변수
                var selectedCellForReplacement = null;
                var replacementCell = null;
                
                // 도형 교체 함수
                function replaceShape(targetCell, newShapeStyle) {
                    if (targetCell == null || !graph.getModel().isVertex(targetCell)) {
                        console.log('교체할 수 있는 도형이 선택되지 않았습니다.');
                        return;
                    }
                    
                    graph.getModel().beginUpdate();
                    try {
                        // 기존 도형의 정보 저장
                        var oldGeometry = graph.getModel().getGeometry(targetCell);
                        var oldValue = graph.getModel().getValue(targetCell);
                        var oldParent = graph.getModel().getParent(targetCell);
                        var oldConnections = graph.getModel().getEdges(targetCell);
                        
                        // 새 도형 생성
                        var newCell = graph.insertVertex(
                            oldParent,
                            null,
                            oldValue,
                            oldGeometry.x,
                            oldGeometry.y,
                            oldGeometry.width,
                            oldGeometry.height,
                            newShapeStyle
                        );
                        
                        // 특정 도형에 기본 속성 추가 (예시: cylinder에 height: 100 추가)
                        if (newShapeStyle === 'cylinder') {
                            var value = graph.getModel().getValue(newCell);
                            
                            // XML 노드가 아니면 생성
                            if (!mxUtils.isNode(value)) {
                                var doc = mxUtils.createXmlDocument();
                                var obj = doc.createElement('object');
                                obj.setAttribute('label', value || '');
                                value = obj;
                            }
                            
                            // height 속성을 XML 속성으로 추가 (Properties 패널에서 편집 가능)
                            value.setAttribute('height', '100');
                            graph.getModel().setValue(newCell, value);
                            
                            console.log('Cylinder 도형에 기본 속성 height: 100이 추가되었습니다.');
                            console.log('이제 Properties 패널에서 height 값을 직접 수정할 수 있습니다.');
                        }
                        
                        // 기존 연결선들을 새 도형으로 재연결
                        if (oldConnections != null) {
                            for (var i = 0; i < oldConnections.length; i++) {
                                var edge = oldConnections[i];
                                var source = graph.getModel().getTerminal(edge, true);
                                var target = graph.getModel().getTerminal(edge, false);
                                
                                if (source == targetCell) {
                                    graph.getModel().setTerminal(edge, newCell, true);
                                }
                                if (target == targetCell) {
                                    graph.getModel().setTerminal(edge, newCell, false);
                                }
                            }
                        }
                        
                        // 기존 도형 삭제
                        graph.removeCells([targetCell]);
                        
                        // 새 도형 선택
                        graph.setSelectionCell(newCell);
                        
                        console.log('도형이 성공적으로 교체되었습니다.');
                        console.log('새 도형 ID:', newCell.getId());
                        console.log('새 도형 스타일:', newShapeStyle);
                        
                    } finally {
                        graph.getModel().endUpdate();
                    }
                }
                
                // 도형 교체 UI 생성
                function createReplacementUI() {
                    var replacementDiv = document.createElement('div');
                    replacementDiv.style.background = '#ffffff';
                    replacementDiv.style.border = '1px solid #ccc';
                    replacementDiv.style.borderRadius = '4px';
                    replacementDiv.style.position = 'fixed';
                    replacementDiv.style.padding = '15px';
                    replacementDiv.style.width = '300px';
                    replacementDiv.style.height = '200px';
                    replacementDiv.style.top = '500px';
                    replacementDiv.style.right = '20px';
                    replacementDiv.style.zIndex = '1000';
                    replacementDiv.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
                    replacementDiv.style.fontFamily = 'Arial, sans-serif';
                    replacementDiv.style.fontSize = '12px';
                    
                    // Chromeless 모드가 아닌 경우 위치 조정
                    if (!ui.editor.isChromelessView()) {
                        replacementDiv.style.top = '520px';
                        replacementDiv.style.right = '280px';
                    }
                    
                    replacementDiv.innerHTML = `
                        <h3 style="margin:0 0 10px 0;color:#666;">도형 교체</h3>
                        <div style="margin-bottom:10px;">
                            <label style="display:block;margin-bottom:5px;font-weight:bold;color:#555;">새 도형 스타일:</label>
                            <select id="newShapeStyle" style="width:100%;padding:5px;border:1px solid #ddd;border-radius:3px;">
                                <option value="ellipse">원형</option>
                                <option value="rectangle">사각형</option>
                                <option value="rounded=1">둥근 사각형</option>
                                <option value="rhombus">다이아몬드</option>
                                <option value="triangle">삼각형</option>
                                <option value="hexagon">육각형</option>
                                <option value="cylinder">실린더</option>
                                <option value="actor">액터</option>
                                <option value="cloud">구름</option>
                                <option value="star">별</option>
                                <option value="parallelogram">평행사변형</option>
                                <option value="trapezoid">사다리꼴</option>
                                <option value="octagon">팔각형</option>
                                <option value="cross">십자가</option>
                                <option value="cube">큐브</option>
                                <option value="note">노트</option>
                                <option value="document">문서</option>
                                <option value="database">데이터베이스</option>
                                <option value="process">프로세스</option>
                                <option value="decision">결정</option>
                                <option value="terminator">시작/종료</option>
                                <option value="data">데이터</option>
                                <option value="input">입력</option>
                                <option value="output">출력</option>
                                <option value="storage">저장소</option>
                                <option value="display">디스플레이</option>
                                <option value="manual">수동</option>
                                <option value="preparation">준비</option>
                                <option value="loop">반복</option>
                                <option value="connector">연결자</option>
                                <option value="offpage">페이지 외부</option>
                                <option value="summing">합산</option>
                                <option value="or">OR</option>
                                <option value="xor">XOR</option>
                                <option value="sort">정렬</option>
                                <option value="extract">추출</option>
                                <option value="merge">병합</option>
                                <option value="internal">내부</option>
                                <option value="external">외부</option>
                                <option value="card">카드</option>
                                <option value="tape">테이프</option>
                                <option value="punched">천공</option>
                                <option value="display">표시</option>
                                <option value="delay">지연</option>
                                <option value="manual">수동</option>
                                <option value="preparation">준비</option>
                                <option value="loop">반복</option>
                                <option value="connector">연결자</option>
                                <option value="offpage">페이지 외부</option>
                                <option value="summing">합산</option>
                                <option value="or">OR</option>
                                <option value="xor">XOR</option>
                                <option value="sort">정렬</option>
                                <option value="extract">추출</option>
                                <option value="merge">병합</option>
                                <option value="internal">내부</option>
                                <option value="external">외부</option>
                                <option value="card">카드</option>
                                <option value="tape">테이프</option>
                                <option value="punched">천공</option>
                                <option value="display">표시</option>
                                <option value="delay">지연</option>
                            </select>
                        </div>
                        <button id="replaceShapeBtn" style="width:100%;padding:8px;background:#007acc;color:white;border:none;border-radius:3px;cursor:pointer;margin-bottom:10px;">
                            도형 교체 (Ctrl+R)
                        </button>
                        <div id="replacementStatus" style="color:#666;font-size:11px;"></div>
                        <div style="margin-top:10px;font-size:10px;color:#999;">
                            <strong>단축키:</strong><br>
                            Ctrl+R: 선택된 도형을 현재 선택된 스타일로 교체<br>
                            Ctrl+1~9: 빠른 도형 교체 (1=원형, 2=사각형, 3=다이아몬드 등)<br><br>
                            <strong>기본 속성:</strong><br>
                            • Cylinder: height=100 (Properties 패널에서 편집 가능)
                        </div>
                    `;
                    
                    document.body.appendChild(replacementDiv);
                    
                    // 교체 버튼 이벤트
                    document.getElementById('replaceShapeBtn').addEventListener('click', function() {
                        var selectedCell = graph.getSelectionCell();
                        var newStyle = document.getElementById('newShapeStyle').value;
                        
                        if (selectedCell != null && graph.getModel().isVertex(selectedCell)) {
                            replaceShape(selectedCell, newStyle);
                            document.getElementById('replacementStatus').innerHTML = '도형이 교체되었습니다!';
                            setTimeout(function() {
                                document.getElementById('replacementStatus').innerHTML = '';
                            }, 2000);
                        } else {
                            document.getElementById('replacementStatus').innerHTML = '교체할 도형을 선택해주세요.';
                        }
                    });
                    
                    // 키보드 단축키 설정
                    var quickShapes = [
                        'ellipse',      // 1
                        'rectangle',    // 2
                        'rhombus',      // 3
                        'triangle',     // 4
                        'hexagon',      // 5
                        'cylinder',     // 6
                        'actor',        // 7
                        'cloud',        // 8
                        'star'          // 9
                    ];
                    
                    // 키보드 이벤트 리스너 추가
                    document.addEventListener('keydown', function(event) {
                        var selectedCell = graph.getSelectionCell();
                        
                        if (selectedCell != null && graph.getModel().isVertex(selectedCell)) {
                            // Ctrl+R: 현재 선택된 스타일로 교체
                            if (event.ctrlKey && event.key === 'r') {
                                event.preventDefault();
                                var newStyle = document.getElementById('newShapeStyle').value;
                                replaceShape(selectedCell, newStyle);
                                document.getElementById('replacementStatus').innerHTML = '도형이 교체되었습니다! (Ctrl+R)';
                                setTimeout(function() {
                                    document.getElementById('replacementStatus').innerHTML = '';
                                }, 2000);
                            }
                            // Ctrl+1~9: 빠른 도형 교체
                            else if (event.ctrlKey && event.key >= '1' && event.key <= '9') {
                                event.preventDefault();
                                var index = parseInt(event.key) - 1;
                                if (index < quickShapes.length) {
                                    var newStyle = quickShapes[index];
                                    replaceShape(selectedCell, newStyle);
                                    document.getElementById('replacementStatus').innerHTML = '도형이 교체되었습니다! (Ctrl+' + event.key + ')';
                                    setTimeout(function() {
                                        document.getElementById('replacementStatus').innerHTML = '';
                                    }, 2000);
                                }
                            }
                        }
                    });
                }
                
                // 선택 변경 이벤트 리스너
                graph.getSelectionModel().addListener(mxEvent.CHANGE, function(sender, evt)
                {
                    var cell = graph.getSelectionCell();
                    var selectedCells = graph.getSelectionCells();
                    
                    // 선택된 객체 정보를 콘솔에 출력
                    if (selectedCells != null && selectedCells.length > 0) {
                        console.log('=== 선택된 객체 정보 ===');
                        console.log('선택된 객체 수:', selectedCells.length);
                        
                        if (selectedCells.length === 1) {
                            // 단일 객체 선택
                            var cell = selectedCells[0];
                            console.log('Cell ID:', cell.getId());
                            console.log('Cell Type:', graph.getModel().isVertex(cell) ? 'Vertex' : 'Edge');
                            console.log('Cell Value:', graph.getModel().getValue(cell));
                            console.log('Cell Style:', graph.getModel().getStyle(cell));
                            console.log('Cell Geometry:', graph.getModel().getGeometry(cell));
                            
                            // 셀의 모든 속성 출력
                            var value = graph.getModel().getValue(cell);
                            if (mxUtils.isNode(value)) {
                                console.log('Cell Attributes:');
                                for (var i = 0; i < value.attributes.length; i++) {
                                    var attr = value.attributes[i];
                                    console.log('  ' + attr.name + ': ' + attr.value);
                                }
                            }
                            
                            // 부모 셀 정보
                            var parent = graph.getModel().getParent(cell);
                            if (parent != null) {
                                console.log('Parent Cell ID:', parent.getId());
                            }
                            
                            // 자식 셀들 정보
                            var children = graph.getModel().getChildren(cell);
                            if (children != null && children.length > 0) {
                                console.log('Child Cells:', children.length);
                                for (var i = 0; i < children.length; i++) {
                                    console.log('  Child ' + i + ' ID:', children[i].getId());
                                }
                            }
                            
                            // 연결된 엣지들 정보
                            var edges = graph.getModel().getEdges(cell);
                            if (edges != null && edges.length > 0) {
                                console.log('Connected Edges:', edges.length);
                                for (var i = 0; i < edges.length; i++) {
                                    console.log('  Edge ' + i + ' ID:', edges[i].getId());
                                }
                            }
                        } else {
                            // 다중 객체 선택
                            console.log('다중 선택된 객체들:');
                            for (var i = 0; i < selectedCells.length; i++) {
                                var cell = selectedCells[i];
                                console.log('  [' + i + '] ID:', cell.getId(), 
                                          'Type:', graph.getModel().isVertex(cell) ? 'Vertex' : 'Edge',
                                          'Value:', graph.getModel().getValue(cell));
                            }
                        }
                        
                        console.log('========================');
                    } else {
                        console.log('선택된 객체가 없습니다.');
                    }
                    
                    updatePropertiesPanel(cell);
                });
                
                // 도형 교체 UI 생성
                createReplacementUI();
                
                // 셀 추가 이벤트 리스너
                graph.addListener(mxEvent.CELLS_ADDED, function(sender, evt)
                {
                    var cells = evt.getProperty('cells');
                    if (cells != null && cells.length > 0)
                    {
                        // 새로 추가된 셀이 선택되면 속성창 업데이트
                        setTimeout(function()
                        {
                            var cell = graph.getSelectionCell();
                            if (cell != null && mxUtils.indexOf(cells, cell) >= 0)
                            {
                                updatePropertiesPanel(cell);
                            }
                        }, 100);
                    }
                });
                
                // 모델 변경 이벤트 리스너
                graph.getModel().addListener(mxEvent.CHANGE, function(sender, evt)
                {
                    var cell = graph.getSelectionCell();
                    if (cell != null)
                    {
                        // 속성창 새로고침을 지연시켜 입력 중인 필드가 깜빡이지 않도록 함
                        setTimeout(function()
                        {
                            // 현재 포커스된 입력 필드가 있으면 업데이트하지 않음
                            var activeElement = document.activeElement;
                            if (activeElement && activeElement.tagName === 'INPUT' && 
                                activeElement.id && activeElement.id.startsWith('prop_')) {
                                return;
                            }
                            updatePropertiesPanel(cell);
                        }, 100);
                    }
                });
            });
        } else {
            // Draw 객체가 아직 로드되지 않았으면 100ms 후 다시 시도
            setTimeout(waitForDraw, 100);
        }
    }
    
    // Draw 객체 대기 시작
    waitForDraw();
});