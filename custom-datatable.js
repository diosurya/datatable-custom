let currentPage = 1;
let sortBy = tableConfig.defaultSortBy;
let sortOrder = tableConfig.defaultSortOrder;
let searchTerm = '';
let startDate = '';
let endDate = '';
let axiosCancelTokenSource = null;

function generateTableHTML() {
    const tableHTML = `
        <table class="table" id="${tableConfig.tableId}" style="width:100%;">
            <thead>
                <tr>
                    ${tableConfig.columns.map(column => `
                        <th scope="col" style="width: ${column.width}" class="bg-white ${column.align} ${column.sort ? 'sort-column' : ''}" ${column.sort ? `data-sort="${column.data}"` : ''}>
                            <span>${column.label}</span> ${column.sort ? `<i class="fa fa-sort" aria-hidden="true"></i>` : ''} 
                        </th>`).join('')}
                </tr>
            </thead>
            <tbody></tbody>
        </table>
        <div class="data-info">
        </div>
        <div id="pagination">
            <button id="prevPage">Prev</button>
            <ul id="pageNumbers"></ul>
            <button id="nextPage" disabled>Next</button>
        </div>
    `;

    $(tableConfig.id).html(tableHTML);

    if (tableConfig.showSearch) {
        $(tableConfig.id).before(`
            <div style="margin-bottom:0.5rem; display: grid;grid-template-columns: 30% 70%;">
                <div class="form-group d-flex align-items-center">
                    <div class="search-container">
                        <input type="text" class="form-control" id="searchTitle" placeholder="Search by Title">
                        <i class="fa fa-search search-icon"></i>
                    </div>
                </div>
                <div class="filters-table d-flex justify-content-end justify-self-right">
                    <div id="boxReset" class="d-flex align-items-center">
                        
                    </div>
                    
                    <div id="dateRange" class="date-range text-grey d-flex align-items-center">
                        <span style="margin-right: 7px;">Filter Date</span>&nbsp;<i class="fa fa-caret-down"></i>
                    </div>


                </div>
                
            </div>
        `);
    }
    // const filterLength = tableConfig.filterLength !== null ? tableConfig.filterLength : [5];

    // Add options to the #rowLength dropdown
    // const rowLengthDropdown = $("#rowLength");
    // filterLength.forEach(length => {
    //     rowLengthDropdown.append(`<option value="${length}">${length}</option>`);
    // });
}


// Event Handling Functions
// $(document).on("click", "#analyticsPost", function() {
//     handleAnalyticsPost();
//     initializeDateRangePicker();
// });
$(document).on("click", "#nextPage", ()=> {
    handlePaginationClick(currentPage + 1)
});
$(document).on("click", "#prevPage", ()=> {
    handlePaginationClick(currentPage > 1 ? currentPage - 1 : 1)
});
$(document).on("click", ".sort-column", function() {
    const sortField = $(this).data('sort');
    handleSortClick(this, sortField);
});
$(document).on("click", ".page-number", handlePageNumberClick);
$(document).on('input', '#searchTitle', handleSearchTitleInput);
$(document).on("click", ".reset-filters", function () {
    resetAllFilters();
});
// End Event Handling Functions

// Funsi helper
function dataInfo(startDate, endDate) {
    let dataInfoMessage = startDate && endDate
    ? `Data displayed from ${moment(startDate).format('D MMM, YYYY')} - ${moment(endDate).format('D MMM, YYYY')}.`
    : tableConfig.defaultDataInfo || tableConfig.defaultDataInfo;

    return $(".data-info").html(`<span>${dataInfoMessage}</span>`);
}
function initializeDateRangePicker() {
    let start = moment();
    let end = moment();

    $('#dateRange').daterangepicker({
        startDate: start,
        endDate: end,
        maxDate: moment(),
        alwaysShowCalendars: true,
        buttonClasses: "btn btn-sm",
        applyButtonClasses: "btn-primary",
        cancelClass: "btn-default",
        ranges: {
            'Last 7 Days': [moment().subtract(6, 'days'), moment()],
            'Last 30 Days': [moment().subtract(29, 'days'), moment()],
            'This Month': [moment().startOf('month'), moment().endOf('month')],
            'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
        }
    }, function (selectedStartDate, selectedEndDate) {
        startDate = selectedStartDate.format("YYYY-MM-DD");
        endDate = selectedEndDate.format("YYYY-MM-DD");
        $('#dateRange span').html(moment(startDate).format('D MMM, YYYY') + ' - ' + moment(endDate).format('D MMM, YYYY'));
        $("#boxReset").html(`<div class="reset-filters">
            <span id="resetButton"><i class="fa fa-refresh"></i></span>
        </div>`);
        getDataAnalyticsPost();
    });
}
function handleAnalyticsPost() {
    getDataAnalyticsPost(currentPage, tableConfig.itemsPerPage, sortBy, sortOrder, searchTerm);
}

function handleSortClick(clickedColumn, sortField) {
    sortOrder = sortField === sortBy ? toggleSortOrder(sortOrder) : 'desc';
    updateSortIcon(clickedColumn);
    sortBy = sortField;
    getDataAnalyticsPost(currentPage, tableConfig.itemsPerPage, sortBy, sortOrder, searchTerm);
}

function handlePageNumberClick() {
    const page = parseInt($(this).text(), 10);
    currentPage = page;
    getDataAnalyticsPost(currentPage, tableConfig.itemsPerPage, sortBy, sortOrder, searchTerm);
}

function handlePaginationClick(newPage) {
    currentPage = newPage;
    getDataAnalyticsPost(currentPage, tableConfig.itemsPerPage, sortBy, sortOrder, searchTerm);
}

function handleSearchTitleInput() {
    cancelPreviousRequest();
    searchTerm = this.value;
    resetSortIcons();
    performSearch(searchTerm);
}
function updateSortIcon(clickedColumn) {
    $('.sort-column i').removeClass('fa-sort-up fa-sort-down').addClass('fa-sort');
    const sortIcon = $(clickedColumn).find('i');
    const sortIconClass = sortOrder === 'asc' ? 'fa-sort-up sort-active' : 'fa-sort-down sort-active';
    sortIcon.removeClass('fa-sort').addClass(sortIconClass);
}
function resetSortIcons() {
    $('.sort-column i').removeClass('fa-sort-up fa-sort-down sort-active').addClass('fa-sort');
}

function generatePageNumbers(current_page, totalPages, lastPage) {
    const pageNumbers = $("#pageNumbers");
    pageNumbers.empty();
    for (let i = 1; i <= totalPages; i++) {
        const li = `<li class="page-number ${i === currentPage ? 'active' : ''}">${i}</li>`;
        pageNumbers.append(li);
    }
    if (current_page === 1) {
        $("#prevPage").prop("disabled", true);
    } else {
        $("#prevPage").prop("disabled", false);
    }
    if (currentPage === lastPage) {
        $("#nextPage").prop("disabled", true);
    } else {
        $("#nextPage").prop("disabled", false);
    }
}

function toggleSortOrder(currentOrder) {
    return currentOrder === 'asc' ? 'desc' : 'asc';
}
// End Funsi helper

// Fungsi Reset
function resetAllFilters() {
    searchTerm = '';
    startDate = '';
    endDate = '';
    currentPage = 1;
    sortBy = tableConfig.defaultSortBy;
    sortOrder = tableConfig.defaultSortOrder;
    $("#searchTitle").val('');
    $('#dateRange span').html('Filter Date');
    $(".reset-filters").remove();
    resetSortIcons();

    let start = moment();
    let end = moment();
    $('#dateRange').data('daterangepicker').setStartDate(start);
    $('#dateRange').data('daterangepicker').setEndDate(end);
    dataInfo(startDate, endDate);
    getDataAnalyticsPost();
}
// End Fungsi Reset

// Funsi Utama
function cancelPreviousRequest() {
    if (axiosCancelTokenSource) {
        axiosCancelTokenSource.cancel('Request canceled due to new input');
    }
    axiosCancelTokenSource = axios.CancelToken.source();
}
function performSearch() {
    searchTerm = $("#searchTitle").val();
    currentPage = 1;
    sortOrder = 'desc';
    getDataAnalyticsPost(currentPage, tableConfig.itemsPerPage, sortBy, sortOrder, searchTerm);
}

async function getDataAnalyticsPost(page, itemsPerPage, sortBy, sortOrder, searchTerm) {
    cancelPreviousRequest();

    const tb = $("#"+tableConfig.tableId);
    tb.find("tbody").empty();
    tb.find("tbody").append(`<tr class="skeleton"><td colspan="${tableConfig.columns.length}"><div class="bar-skeleton"></div></td></tr>`);
    try {
        const { data } = await axios.get(`${apiConfig.baseUrl}${apiConfig.endpoint}`, {
            cancelToken: axiosCancelTokenSource.token,
            params: {
                listing_id: listingId,
                page,
                itemsPerPage,
                sortBy,
                sortOrder,
                searchTitle: searchTerm,
                startDate,
                endDate
            }
        });

        const checkData = Object.keys(data.data).length;

        itemsPerPage = data.data.per_page;
        if(checkData) {
            $("#pagination").show();
            $(".data-info").show();
            renderData(tb, data);
        } else {
            if(searchTerm){
                $("#pagination").hide();
                $(".data-info").hide();
                tb.find("tbody").append(`<tr><td colspan="${tableConfig.columns.length}">No matching results found for "${searchTerm}"</td></tr>`);
            } else if(startDate && startDate) {
                $("#pagination").hide();
                $(".data-info").hide();
                tb.find("tbody").append(`tr><td colspan="${tableConfig.columns.length}">No data available for the date range ${moment(startDate).format('D MMMM YYYY')} - ${moment(endDate).format('D MMMM YYYY')}</td></tr>`);
            } else {
                $("#pagination").hide();
                $(".data-info").hide();
                tb.find("tbody").append(`<tr><td colspan="${tableConfig.columns.length}">No data.</td></tr>`);
            }
        }

        dataInfo(startDate, endDate);
        generatePageNumbers(data.data.current_page, data.data.last_page, data.data.last_page);
        tb.find(".skeleton").remove();
        
        
    } catch (err) {
        handleRequestError(err);
    }
}

function renderData(tb, responseData) {
    tb.find("tbody").empty();

    const data = responseData.data.data;

    if (!data || !Array.isArray(data)) {
        console.error("Invalid data structure. Unable to render data.");
        return;
    }

    data.forEach((item, index) => {
        const isLastItem = index === data.length - 1;

        const rowHTML = tableConfig.columns.map(column => {
            let columnData = item[column.data];

            if (column.formatDate && moment(columnData).isValid()) {
                columnData = moment(columnData).format(column.formatDate);
            }

            return `<td class="${column.align ? column.align : ''}">${columnData}</td>`;
        }).join('');

        const rowClass = isLastItem ? 'hover border-bottom' : 'hover';

        tb.find("tbody").append(`<tr class="${rowClass}" data-id="${item.id}">${rowHTML}</tr>`);
    });
}


function handleRequestError(err) {
    if (axios.isCancel(err)) {
        // console.log("Request Cancel: ", err);
    } else {
        console.log("Axios err: ", err);
    }
}
// End Funsi Utama
