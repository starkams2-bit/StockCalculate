const COLUMNS_TO_SHOW = [0, 2, 3, 4, 5, 6, 8];

document.addEventListener('DOMContentLoaded', () => {
    // '데이터 지움' 버튼
    document.getElementById('clearDataBtn').addEventListener('click', () => {
        document.getElementById('dataInput').value = '';
        document.getElementById('stockTable').innerHTML = '';
    });

    // '붙여넣기' 버튼
    document.getElementById('pasteAndLoadBtn').addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            const dataInput = document.getElementById('dataInput');
            dataInput.value = text; // 입력창 내용 교체
            loadData(); // 데이터 자동 로드
        } catch (err) {
            console.error('클립보드 읽기 실패:', err);
            alert('클립보드에서 데이터를 붙여넣는 데 실패했습니다. 브라우저 권한을 확인해주세요.');
        }
    });
});

function loadData() {
    const data = document.getElementById('dataInput').value.replace(/"/g, '');
    const rows = data.split('\n').filter(row => row.trim() !== '');
    if (rows.length === 0) return;

    const table = document.getElementById('stockTable');
    table.innerHTML = '';

    const headerData = rows[0].split('\t');
    const headerRow = document.createElement('tr');
    
    COLUMNS_TO_SHOW.forEach(index => {
        const th = document.createElement('th');
        th.textContent = headerData[index] ? headerData[index].trim() : '';
        headerRow.appendChild(th);
    });

    const calcHeaders = [
        '목표가', '추가매수량', '투입금액',
        '목표가', '추가매수량', '투입금액',
        '목표가', '추가매수량', '투입금액'
    ];
    calcHeaders.forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    for (let i = 1; i < rows.length; i++) {
        const fullRowData = rows[i].split('\t');
        const tr = document.createElement('tr');
        tr.dataset.fullRow = JSON.stringify(fullRowData);

        COLUMNS_TO_SHOW.forEach((colIndex) => {
            const td = document.createElement('td');
            let cellText = fullRowData[colIndex] ? fullRowData[colIndex].trim() : '';

            if (colIndex === 0 && cellText.startsWith("'")) {
                cellText = cellText.substring(1);
            }

            if (colIndex === 8) {
                const input = document.createElement('input');
                input.type = 'number';
                input.step = '0.0001';
                input.value = parseFloat(cellText.replace(/,/g, '')) || 0;
                input.addEventListener('input', () => runAllCalculations(i));
                td.appendChild(input);
            } else {
                td.textContent = cellText;
            }
            tr.appendChild(td);
        });

        addCalculatorCells(tr, i);
        table.appendChild(tr);
    }
}

function addCalculatorCells(tr, rowIndex) {
    tr.appendChild(createCell(`calc-group-1`, `targetPriceByShares-${rowIndex}`));
    tr.appendChild(createInputCell(`sharesInput-${rowIndex}`, 'calc-group-1', () => calculateByShares(rowIndex)));
    tr.appendChild(createCell(`calc-group-1`, `amountByShares-${rowIndex}`));

    tr.appendChild(createCell(`calc-group-2`, `targetPriceByAmount-${rowIndex}`));
    tr.appendChild(createCell(`calc-group-2`, `sharesByAmount-${rowIndex}`));
    tr.appendChild(createInputCell(`amountInput-${rowIndex}`, 'calc-group-2', () => calculateByAmount(rowIndex)));

    tr.appendChild(createInputCell(`targetPriceInput-${rowIndex}`, 'calc-group-3', () => calculateByTargetPrice(rowIndex)));
    tr.appendChild(createCell(`calc-group-3`, `sharesByTargetPrice-${rowIndex}`));
    tr.appendChild(createCell(`calc-group-3`, `amountByTargetPrice-${rowIndex}`));
}

function createCell(className, id) {
    const td = document.createElement('td');
    td.className = className;
    td.id = id;
    return td;
}

function createInputCell(id, className, eventListener) {
    const td = document.createElement('td');
    td.className = className;
    const input = document.createElement('input');
    input.type = 'number';
    input.step = '0.0001';
    input.min = '0';
    input.id = id;
    input.addEventListener('input', eventListener);
    td.appendChild(input);
    return td;
}

function runAllCalculations(rowIndex) {
    calculateByShares(rowIndex);
    calculateByAmount(rowIndex);
    calculateByTargetPrice(rowIndex);
}

function getBaseData(tr) {
    const fullData = JSON.parse(tr.dataset.fullRow);
    const existingShares = parseFloat(fullData[6].replace(/,/g, '')) || 0;
    const existingAmount = parseFloat(fullData[12].replace(/,/g, '')) || 0;
    const existingAvgPrice = existingShares > 0 ? existingAmount / existingShares : 0;
    const currentPrice = parseFloat(tr.cells[6].firstChild.value) || 0;
    return { existingShares, existingAvgPrice, currentPrice, existingAmount };
}

function calculateByShares(rowIndex) {
    const tr = document.getElementById('stockTable').rows[rowIndex];
    const { existingShares, currentPrice, existingAmount } = getBaseData(tr);
    const additionalShares = parseFloat(document.getElementById(`sharesInput-${rowIndex}`).value) || 0;

    const newTotalShares = existingShares + additionalShares;
    if (newTotalShares > 0) {
        const newAvgPrice = (existingAmount + (additionalShares * currentPrice)) / newTotalShares;
        document.getElementById(`targetPriceByShares-${rowIndex}`).textContent = newAvgPrice.toFixed(4);
        document.getElementById(`amountByShares-${rowIndex}`).textContent = (additionalShares * currentPrice).toLocaleString('en-US', {maximumFractionDigits: 0});
    } else { /* 초기화 */ }
}

function calculateByAmount(rowIndex) {
    const tr = document.getElementById('stockTable').rows[rowIndex];
    const { existingShares, currentPrice, existingAmount } = getBaseData(tr);
    const additionalAmount = parseFloat(document.getElementById(`amountInput-${rowIndex}`).value) || 0;
    
    if (currentPrice > 0) {
        const additionalShares = Math.floor(additionalAmount / currentPrice);
        const actualInvestedAmount = additionalShares * currentPrice;
        document.getElementById(`sharesByAmount-${rowIndex}`).textContent = additionalShares;

        const newTotalShares = existingShares + additionalShares;
        if (newTotalShares > 0) {
            const newAvgPrice = (existingAmount + actualInvestedAmount) / newTotalShares;
            document.getElementById(`targetPriceByAmount-${rowIndex}`).textContent = newAvgPrice.toFixed(4);
        }
    } else { /* 초기화 */ }
}

function calculateByTargetPrice(rowIndex) {
    const tr = document.getElementById('stockTable').rows[rowIndex];
    const { existingShares, existingAvgPrice, currentPrice } = getBaseData(tr);
    const targetPrice = parseFloat(document.getElementById(`targetPriceInput-${rowIndex}`).value) || 0;

    if (currentPrice > 0 && targetPrice > 0 && targetPrice < existingAvgPrice && targetPrice > currentPrice) {
        const additionalShares = existingShares * (existingAvgPrice - targetPrice) / (targetPrice - currentPrice);
        const additionalAmount = additionalShares * currentPrice;
        document.getElementById(`sharesByTargetPrice-${rowIndex}`).textContent = Math.ceil(additionalShares).toLocaleString();
        document.getElementById(`amountByTargetPrice-${rowIndex}`).textContent = additionalAmount.toLocaleString('en-US', {maximumFractionDigits: 0});
    } else {
        document.getElementById(`sharesByTargetPrice-${rowIndex}`).textContent = '계산불가';
        document.getElementById(`amountByTargetPrice-${rowIndex}`).textContent = '';
    }
}
