const COLUMNS_TO_SHOW = [0, 2, 3, 4, 5, 6, 8];

document.addEventListener('DOMContentLoaded', () => {
    // '가용금액' 입력값 변경 시 표 자동 반영
    document.getElementById('availableAmount').addEventListener('input', () => {
        updateAvailableAmountInTable();
    });
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
    updateAvailableAmountInTable();
}
// '가용금액' 입력값을 표의 13번째 셀(투입금액)에 자동 반영하고, 관련 계산도 업데이트
function updateAvailableAmountInTable() {
    const table = document.getElementById('stockTable');
    const availableAmount = parseFloat(document.getElementById('availableAmount').value) || 0;
    for (let i = 1; i < table.rows.length; i++) {
        const tr = table.rows[i];
        // 13번째 셀: 투입금액 (index 12)
        const 투입금액셀 = tr.cells[12];
        if (투입금액셀) {
            투입금액셀.textContent = availableAmount.toLocaleString();
        }
        // 11번째 셀: 목표가 (index 10), 12번째 셀: 추가매수량 (index 11)
        // 예시 계산: 목표가 = (가용금액 / 기존수량) + 현재가, 추가매수량 = 가용금액 / 현재가
        const fullData = JSON.parse(tr.dataset.fullRow);
        const existingShares = parseFloat(fullData[6].replace(/,/g, '')) || 0;
        const currentPrice = parseFloat(tr.cells[6].firstChild ? tr.cells[6].firstChild.value : tr.cells[6].textContent) || 0;
        // 추가매수량 계산
        let 추가매수량 = 0;
        if (currentPrice > 0) {
            추가매수량 = Math.floor(availableAmount / currentPrice);
            tr.cells[11].textContent = 추가매수량;
        }
        // 목표가 계산: ((매입가 * 보유량)+(현재가 * 추가매수량))/(보유량+추가매수량)
        const 매입가 = parseFloat(fullData[5].replace(/,/g, '')) || 0;
        if (existingShares + 추가매수량 > 0) {
            const 목표가 = ((매입가 * existingShares) + (currentPrice * 추가매수량)) / (existingShares + 추가매수량);
            tr.cells[10].textContent = 목표가.toFixed(2);
        }
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
