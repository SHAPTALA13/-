import { mnemonicNew, mnemonicToPrivateKey } from 'https://esm.sh/@ton/crypto@3.4.0';
import { WalletContractV4 } from 'https://esm.sh/@ton/ton@16.0.0';
import { StonApiClient } from 'https://esm.sh/@ston-fi/api@0.32.0';
import { dexFactory, Client as TonClient } from 'https://esm.sh/@ston-fi/sdk@2.7.0';

const $ = id => document.getElementById(id);
const toast = msg => { $('toast').textContent = msg; $('toast').classList.add('show'); setTimeout(() => $('toast').classList.remove('show'), 2600); };
const ston = new StonApiClient();
const tonClient = new TonClient({ endpoint: 'https://toncenter.com/api/v2/jsonRPC' });
const prices = { ton: 0, btc: 0, usdt: 1 };
let assets = [];
let selectedFrom, selectedTo, lastSimulation;

function money(v){ return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:v < 1 ? 6 : 2}).format(v || 0); }
function sign(v){ return `${v >= 0 ? '+' : ''}${Number(v).toFixed(2)}% за 24ч`; }
function esc(s){ return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }

async function loadPrices(){
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network,bitcoin,tether&vs_currencies=usd&include_24hr_change=true',{cache:'no-store'});
    if(!r.ok) throw Error('price api');
    const d=await r.json(); prices.ton=d['the-open-network'].usd; prices.btc=d.bitcoin.usd; prices.usdt=d.tether.usd;
    $('tonPrice').textContent=money(prices.ton); $('btcPrice').textContent=money(prices.btc); $('usdtPrice').textContent=money(prices.usdt);
    $('tonChange').textContent=sign(d['the-open-network'].usd_24h_change); $('btcChange').textContent=sign(d.bitcoin.usd_24h_change); $('heroPrice').textContent=money(prices.ton); $('heroChange').textContent=sign(d['the-open-network'].usd_24h_change); quotePreview();
  } catch(e){ toast('CoinGecko сейчас не ответил; попробуй обновить страницу.'); }
}

function getMeta(a){ return a ? { decimals:Number(a.meta?.decimals ?? a.decimals ?? 9), symbol:a.meta?.symbol || a.symbol || 'TOKEN' } : null; }
function renderAssetSelects(){
  const list=assets.filter(a=>a?.contractAddress || a?.address).slice(0,300);
  const html=list.map((a,i)=>`<option value="${i}">${esc(getMeta(a).symbol)} — ${esc(a.displayName || a.meta?.displayName || '')}</option>`).join('');
  $('fromAsset').innerHTML=html; $('toAsset').innerHTML=html;
  const fi=Math.min(0,list.length-1), ti=Math.min(1,list.length-1); $('fromAsset').value=fi; $('toAsset').value=ti; selectedFrom=list[fi]; selectedTo=list[ti];
  $('fromAsset').onchange=()=>{selectedFrom=list[Number($('fromAsset').value)];lastSimulation=null;quotePreview();};
  $('toAsset').onchange=()=>{selectedTo=list[Number($('toAsset').value)];lastSimulation=null;quotePreview();};
}
async function loadAssets(){
  try{
    const response=await ston.getAssets();
    assets=Array.isArray(response)?response:(response.assetList || response.assets || response.data || []);
    if(assets.length) renderAssetSelects();
  }catch(e){
    toast('Не удалось загрузить список TON-активов STON.fi.');
  }
}
function quotePreview(){
  const n=Number($('fromAmount').value)||0; $('fromUsd').textContent=`≈ ${money(n * (prices.ton || 0))}`;
  if(selectedFrom && selectedTo) $('toUsd').textContent='Получите точную котировку через STON.fi';
}
$('fromAmount').addEventListener('input',()=>{lastSimulation=null;quotePreview();});
$('flip').onclick=()=>{const v=$('fromAsset').value;$('fromAsset').value=$('toAsset').value;$('toAsset').value=v;$('fromAsset').dispatchEvent(new Event('change'));$('toAsset').dispatchEvent(new Event('change'));};

async function simulate(){
  if(!selectedFrom || !selectedTo) return toast('Выберите активы.');
  const amount=Number($('fromAmount').value); if(!amount || amount<=0) return toast('Введите сумму.');
  const from=getMeta(selectedFrom), offerAddress=selectedFrom.contractAddress || selectedFrom.address;
  const askAddress=selectedTo.contractAddress || selectedTo.address;
  const offerUnits=Math.floor(amount * 10 ** from.decimals).toString();
  try{
    $('swapBtn').disabled=true; $('swapBtn').textContent='Получаем котировку…';
    const sim=await ston.simulateSwap({offerAddress:offerAddress || 'ton',askAddress:askAddress || 'ton',offerUnits,slippageTolerance:'0.01'});
    lastSimulation=sim;
    const to=getMeta(selectedTo); const min=Number(sim.minAskUnits)/10**to.decimals; const expected=sim.askUnits?Number(sim.askUnits)/10**to.decimals:min;
    $('toAmount').value=expected.toFixed(expected<1?8:4); $('quoteRate').textContent=`1 ${from.symbol} ≈ ${(expected/amount).toPrecision(7)} ${to.symbol}`; $('fee').textContent='STON.fi · slippage 1%'; $('toUsd').textContent=`≈ ${money(expected * (prices[to.symbol.toLowerCase()] || 0))}`; $('swapBtn').textContent='Обменять в кошельке'; toast('Получена настоящая котировка STON.fi');
  }catch(e){ console.error(e); lastSimulation=null; toast('Для этой пары сейчас нет доступной котировки.'); $('swapBtn').textContent='Получить котировку'; }
  finally{$('swapBtn').disabled=false;}
}

async function executeSwap(){
  if(!tonUI?.account) return tonUI?.openModal();
  if(!lastSimulation) return simulate();
  try{
    $('swapBtn').disabled=true; $('swapBtn').textContent='Готовим транзакцию…';
    const routerInfo=lastSimulation.router; const dex=dexFactory(routerInfo); const router=tonClient.open(dex.Router.create(routerInfo.address));
    const from=getMeta(selectedFrom), to=getMeta(selectedTo); const offer=lastSimulation.offerUnits, minAsk=lastSimulation.minAskUnits; const user=tonUI.account.address; let tx;
    if((selectedFrom.contractAddress || selectedFrom.address)==='ton' && (selectedTo.contractAddress || selectedTo.address)!=='ton'){
      const pton=dex.pTON.create(routerInfo.ptonMasterAddress);
      tx=await router.getSwapTonToJettonTxParams({userWalletAddress:user,offerAmount:offer,minAskAmount:minAsk,askJettonAddress:lastSimulation.askAddress,proxyTon:pton,queryId:BigInt(Date.now())});
    } else if((selectedFrom.contractAddress || selectedFrom.address)!=='ton' && (selectedTo.contractAddress || selectedTo.address)==='ton'){
      tx=await router.getSwapJettonToTonTxParams({userWalletAddress:user,offerJettonAddress:lastSimulation.offerAddress,offerAmount:offer,minAskAmount:minAsk,proxyTon:dex.pTON.create(routerInfo.ptonMasterAddress),queryId:BigInt(Date.now())});
    } else {
      tx=await router.getSwapJettonToJettonTxParams({userWalletAddress:user,offerJettonAddress:lastSimulation.offerAddress,offerAmount:offer,minAskAmount:minAsk,askJettonAddress:lastSimulation.askAddress,queryId:BigInt(Date.now())});
    }
    await tonUI.sendTransaction({validUntil:Math.floor(Date.now()/1000)+300,messages:[{address:tx.to.toString(),amount:tx.value.toString(),payload:tx.body?.toBoc().toString('base64')}]});
    toast('Транзакция отправлена в кошелёк. Подтверди её там.'); lastSimulation=null; $('swapBtn').textContent='Получить котировку';
  }catch(e){console.error(e);toast(`Обмен отменён или не удался: ${e.message || 'ошибка'}`);}
  finally{$('swapBtn').disabled=false;}
}
$('swapBtn').onclick=()=>lastSimulation?executeSwap():simulate();

let tonUI;
try{
  tonUI=new TON_CONNECT_UI.TonConnectUI({manifestUrl:new URL('tonconnect-manifest.json',location.href).href,buttonRootId:'tonConnect'});
  tonUI.onStatusChange(wallet=>{ if(wallet){$('walletStatus').textContent='Подключён';$('address').textContent=wallet.account.address;loadWalletAssets(wallet.account.address);toast('Кошелёк подключён');} else {$('walletStatus').textContent='Не подключён';$('address').textContent='Подключите TON-кошелёк';} });
}catch(e){console.error('TonConnect',e);}
$('connectWallet').onclick=()=>tonUI?.openModal();

async function loadWalletAssets(address){
  try{
    const r=await fetch(`https://api.ston.fi/v1/wallets/${encodeURIComponent(address)}/assets`); if(!r.ok)return; const d=await r.json(); const list=d.asset_list||d.assets||d.data||[]; if(list.length){$('balance').textContent=`${list.length} активов`;}
  }catch(e){}
}

// A local demo profile for static GitHub Pages. It is not a production identity system.
function localAccount(){return JSON.parse(localStorage.getItem('tonx_profile')||'null');}
function renderProfile(){const p=localAccount();if(p){$('tgBtn').textContent=`@${p.username}`;$('tgBtn').title='Локальный профиль';}}
$('tgBtn').onclick=()=>{const username=prompt('Имя локального профиля (только для этого устройства):',localAccount()?.username||'');if(username){localStorage.setItem('tonx_profile',JSON.stringify({username}));renderProfile();toast('Профиль сохранён локально');}};

const modal=$('modal');
function openModal(mode){modal.classList.remove('hidden');$('seedBox').classList.add('hidden');$('walletAddress').classList.add('hidden');$('seedInput').classList.toggle('hidden',mode!=='import');$('modalTitle').textContent=mode==='new'?'Создать локальный TON-кошелёк':'Импортировать TON seed';$('modalText').textContent='Seed-фраза обрабатывается локально. Никогда не отправляйте её сайту.';$('modalPrimary').textContent=mode==='new'?'Сгенерировать':'Проверить';$('modalPrimary').onclick=mode==='new'?createLocalWallet:importLocalWallet;}
async function createLocalWallet(){showWallet(await mnemonicNew(24));}
async function importLocalWallet(){const words=$('seedInput').value.trim().split(/\s+/).filter(Boolean);if(words.length!==24)return toast('Нужны 24 слова');try{await mnemonicToPrivateKey(words);showWallet(words);}catch(e){toast('Seed-фраза неверна');}}
async function showWallet(words){try{const kp=await mnemonicToPrivateKey(words);const w=WalletContractV4.create({workchain:0,publicKey:kp.publicKey});const address=w.address.toString({bounceable:false,urlSafe:true});$('seedBox').innerHTML=words.map((w,i)=>`<span>${i+1}. ${esc(w)}</span>`).join('');$('seedBox').classList.remove('hidden');$('walletAddress').textContent=address;$('walletAddress').classList.remove('hidden');$('modalText').textContent='Сохрани seed офлайн. Для реального хранения средств лучше использовать внешний аппаратный/мобильный кошелёк.';$('modalPrimary').textContent='Закрыть';$('modalPrimary').onclick=()=>modal.classList.add('hidden');}catch(e){toast('Ошибка создания кошелька');}}
$('createWalletBtn').onclick=()=>openModal('new');$('newWallet').onclick=()=>openModal('new');$('importWallet').onclick=()=>openModal('import');$('closeModal').onclick=()=>modal.classList.add('hidden');

renderProfile();loadPrices();loadAssets();setInterval(loadPrices,60000);
