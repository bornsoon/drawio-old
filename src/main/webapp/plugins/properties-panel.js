/**
 * Properties Panel Plugin - 항상 보이는 속성창
 */
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
		var defaultProps = ['label', 'tooltip', 'placeholders'];
		
		// 기존 속성들 표시
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
			input.onchange = function()
			{
				updateCellProperty(cell, propName, this.value);
			};
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
		
		// 입력 필드 저장
		setTimeout(function()
		{
			var input = document.getElementById(fieldId);
			if (input != null)
			{
				propertyInputs[name] = input;
				input.onchange = function()
				{
					updateCellProperty(cell, name, this.value);
				};
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
			
			// label 속성이 변경된 경우 셀 라벨도 업데이트
			if (propName === 'label')
			{
				graph.getModel().setValue(cell, propValue);
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
	
	// 선택 변경 이벤트 리스너
	graph.getSelectionModel().addListener(mxEvent.CHANGE, function(sender, evt)
	{
		var cell = graph.getSelectionCell();
		updatePropertiesPanel(cell);
	});
	
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
			// 속성창 새로고침 (입력 중인 필드는 유지)
			setTimeout(function()
			{
				updatePropertiesPanel(cell);
			}, 50);
		}
	});
});
