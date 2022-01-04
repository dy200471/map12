import {useMemo, useEffect} from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    Link,
} from "react-router-dom";
import { useTranslation } from 'react-i18next';
import Icon from '@mdi/react'
import {
    mdiClockAlertOutline,
    mdiCloseOctagon,
} from '@mdi/js';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css'; // optional

import DataTable from '../data-table';
import formatPrice from '../../modules/format-price';
import { selectAllItems, fetchItems } from '../../features/items/itemsSlice';
import ValueCell from '../value-cell';
import TraderPriceCell from '../trader-price-cell';
import itemSearch from '../../modules/item-search';

import './index.css';

function traderSellCell(datum) {
    if(!datum.row.original.bestSell?.source || datum.row.original.bestSell.source === '?'){
        return null;
    }

    return <div
        className = 'trader-price-content'
    >
        <img
            alt = {datum.row.original.bestSell.source}
            className = 'trader-icon'
            loading='lazy'
            height = '40'
            src={`${process.env.PUBLIC_URL}/images/${datum.row.original.bestSell.source?.toLowerCase()}-icon.jpg`}
            title = {datum.row.original.bestSell.source}
            width = '40'
        />
        {formatPrice(datum.row.original.bestSell.price)}
    </div>;
};

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function SmallItemTable(props) {
    const {
        maxItems,
        nameFilter,
        defaultRandom,
        typeFilter,
        instaProfit,
        traderPrice,
        traderFilter,
        loyaltyLevelFilter,
        traderValue,
        traderBuybackFilter,
        traderBuyback,
    } = props;
    const dispatch = useDispatch();
    const items = useSelector(selectAllItems);
    const itemStatus = useSelector((state) => {
        return state.items.status;
    });
    const {t} = useTranslation();

    useEffect(() => {
        let timer = false;
        if (itemStatus === 'idle') {
            dispatch(fetchItems());
        }

        if(!timer){
            timer = setInterval(() => {
                dispatch(fetchItems());
            }, 600000);
        }

        return () => {
            clearInterval(timer);
        }
    }, [itemStatus, dispatch]);

    const data = useMemo(() => {
        let returnData = items.map((itemData) => {
            const formattedItem = {
                id: itemData.id,
                name: itemData.name,
                shortName: itemData.shortName,
                normalizedName: itemData.normalizedName,
                avg24hPrice: itemData.avg24hPrice,
                lastLowPrice: itemData.lastLowPrice,
                // iconLink: `https://assets.tarkov-tools.com/${itemData.id}-icon.jpg`,
                iconLink: itemData.iconLink || `${process.env.PUBLIC_URL}/images/unknown-item-icon.jpg`,
                instaProfit: 0,
                itemLink: `/item/${itemData.normalizedName}`,
                traderName: itemData.traderName,
                traderPrice: itemData.traderPrice,
                types: itemData.types,
                buyFor: itemData.buyFor,
                sellFor: itemData.sellFor,
                bestSell: {
                    source: itemData.traderName,
                    price: itemData.traderPrice,
                },
                buyOnFleaPrice: itemData.buyFor.find(buyPrice => buyPrice.source === 'flea-market'),
            };

            if(formattedItem.buyOnFleaPrice){
                formattedItem.instaProfit = itemData.traderPrice - formattedItem.buyOnFleaPrice.price;
            }

            return formattedItem;
        })
        .filter(item => {
            return !item.types.includes('disabled');
        });

        if(nameFilter){
            returnData = itemSearch(returnData, nameFilter);
        }

        if(typeFilter){
            returnData = returnData.filter(item => item.types.includes(typeFilter));
        }

        if(traderFilter){
            returnData = returnData.filter(item => {
                item.buyFor = item.buyFor.filter(buy => buy.source === traderFilter);
                item.sellFor = item.sellFor?.filter(sell => sell.source === traderFilter);
                item.bestSell = item.sellFor?.sort((a, b) => {
                    return b.price - a.price;
                })[0];

                if(item.buyOnFleaPrice){
                    item.instaProfit = item.bestSell?.price - item.buyOnFleaPrice.price;
                }

                if(traderBuybackFilter){
                    return true;
                }

                if(!loyaltyLevelFilter){
                    return item.buyFor[0];
                }

                if(!item.buyFor[0]){
                    return false;
                }

                return item.buyFor[0].requirements[0].value === loyaltyLevelFilter;
            });
        }

        if(traderBuybackFilter){
            returnData = returnData
                .filter(item => item.instaProfit !== 0)
                .filter(item => item.lastLowPrice && item.lastLowPrice > 0)
                .filter(item => item.bestSell && item.bestSell.price > 500)
                .map(item => {
                    return {
                        ...item,
                        buyback: item.bestSell?.price / item.lastLowPrice,
                    };
                })
                .sort((a, b) => {
                    return b.buyback - a.buyback;
                });
        }

        if(defaultRandom && !nameFilter){
            shuffleArray(returnData);
        }

        return returnData;
    },
        [nameFilter, defaultRandom, items, typeFilter, traderFilter, loyaltyLevelFilter, traderBuybackFilter]
    );

    const columns = useMemo(
        () => {
            const useColumns = [
                {
                    Header: t('Name'),
                    accessor: 'name',
                    Cell: (allData) => {
                        // allData.row.original.itemLink
                        return <div
                            className = 'small-item-table-name-wrapper'
                        >
                            <div
                                className = 'small-item-table-image-wrapper'
                            ><img
                                alt = ''
                                className = 'table-image'
                                height = '64'
                                loading = 'lazy'
                                src = { allData.row.original.iconLink }
                                width = '64'
                            /></div>
                            <div>
                                <Link
                                    className = 'craft-reward-item-title'
                                    to = {allData.row.original.itemLink}
                                >
                                    {allData.row.original.name}
                                </Link>
                            </div>
                        </div>
                    },
                },
                {
                    Header: t('Flea'),
                    accessor: d => Number(d.lastLowPrice),
                    Cell: (allData) => {
                        if(allData.row.original.types.includes('noFlea')){
                            return <ValueCell
                                value = {allData.value}
                                noValue = {
                                    <div
                                        className = 'center-content'
                                    >
                                        <Tippy
                                            placement = 'bottom'
                                            content={'This item can\'t be sold on the Flea Market'}
                                        >
                                            <Icon
                                                path={mdiCloseOctagon}
                                                size={1}
                                                className = 'icon-with-text'
                                            />
                                        </Tippy>
                                    </div>
                                }
                            />;
                        }
                        return <ValueCell
                            value = {allData.value}
                            noValue = {
                                <div
                                    className = 'center-content'
                                >
                                    <Tippy
                                        placement = 'bottom'
                                        content={'No flea price seen in the past 24 hours'}
                                    >
                                        <Icon
                                            path={mdiClockAlertOutline}
                                            size={1}
                                            className = 'icon-with-text'
                                        />
                                    </Tippy>
                                </div>
                            }
                        />;
                    },
                    id: 'fleaPrice',
                },
            ];

            if(traderValue){
                useColumns.splice(1, 0, {
                    Header: t('Trader sell'),
                    accessor: d => Number(d.bestSell?.price),
                    Cell: traderSellCell,
                    id: 'traderPrice',
                });
            }

            if(instaProfit){
                useColumns.push({
                    Header: t('InstaProfit'),
                    accessor: 'instaProfit',
                    Cell: ValueCell,
                    id: 'instaProfit',
                    sortDescFirst: true,
                    sortType: 'basic',
                    // sortType: (a, b) => {
                    //     if(a.values.instaProfit === 0){
                    //         return -1;
                    //     }

                    //     if(b.values.instaProfit === 0){
                    //         return 1;
                    //     }

                    //     if(a.values.instaProfit > b.values.instaProfit){
                    //         return 1;
                    //     }

                    //     if(a.values.instaProfit < b.values.instaProfit){
                    //         return -1;
                    //     }

                    //     return 0;
                    // },
                });
            }

            if(traderPrice){
                useColumns.push({
                    Header: t('Trader buy'),
                    accessor: d => Number(d.instaProfit),
                    Cell: TraderPriceCell,
                    id: 'traderBuyCell',
                });
            }

            if(traderBuyback){
                useColumns.push({
                    Header: t('Buyback ratio'),
                    accessor: 'buyback',
                    Cell: ({value}) => {
                        // allData.row.original.itemLink
                        return <div
                            className = 'center-content'
                        >
                            {`${(Math.round(value * 100) / 100).toFixed(2)}%`}
                        </div>
                    },
                    id: 'buyback',
                    sortDescFirst: true,
                    sortType: 'basic',
                });
            }

            return useColumns;
        },
        [t, instaProfit, traderPrice, traderValue, traderBuyback]
    );

    // console.log(data.length);

    let extraRow = false;

    if(data.length <= 0){
        extraRow = t('No items');
    }

    return <DataTable
        className = 'small-data-table'
        columns = {columns}
        extraRow={extraRow}
        key = 'small-item-table'
        data = {data}
        // sortBy = {'profit'}
        // sortByDesc = {true}
        autoResetSortBy = {false}
        maxItems = {maxItems}
        nameFilter = {nameFilter}
    />
}

export default SmallItemTable;