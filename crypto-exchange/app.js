import { mnemonicNew, mnemonicToPrivateKey } from 'https://esm.sh/@ton/crypto@3.4.0';
import { WalletContractV4 } from 'https://esm.sh/@ton/ton@16.0.0';

const api = 'https://api.coingecko.com/api/v3/simple/price?ids=the-open-network,bitcoin,tether&vs_currencies=usd&include_24hr_change=true';
const prices = { ton: 0, btc: 0, usdt: 1 };
const $ = id => document.getElementById(id);
const toast = msg => { $('toast').textContent = msg; $('toast').classList.add('show'); setTimeout(() => $('toast').classList.remove('show'), 2400); };

async function loadPrices(){
  try {
    const r = await fetch(api, { cache:'no-store' });
    if(!r.ok) throw new Error('price api');
    const d = await r.json();
    prices.ton=d['the-open-network'].usd; prices.btc=d.bitcoin.usd; prices.usdt=d.tether.usd;
    $('tonPrice').textContent=money(prices.ton); $('btcPrice').textContent=money(prices.btc); $('usdtPrice').textContent=money(prices.usdt);
    const tc=d['the-open-network'].usd_24h_change, bc=d.bitcoin.usd_24h_change;
    $('tonChange').textContent=sign(tc); $('btcChange').textContent=sign(bc); $('heroPrice').textContent=money(prices.ton); $('heroChange').textContent=sign(tc);
    quote();
  } catch(e){ toast('Не удалось обновить курсы — API временно недоступен'); }
}
function money(v){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:v<1?6:2}).format(v)}
function sign(v){return `${v>=0?'+':''}${Number(v).toFixed(2)}% за 24ч`}
function quote(){
  const from=$('fromAsset').value,to=$('toAsset').value,n=Number($('fromAmount').value)||0;
  if(from===to){$('toAmount').value=n; $('quoteRate').textContent='1 : 1'; return}
  const out=n*prices[from]/prices[to]; $('toAmount').value=Number.isFinite(out)?out.toFixed(out<1?8:4):'—'; $('quoteRate').textContent=`1 ${from.toUpperCase()} ≈ ${(prices[from]/prices[to]).toFixed(prices[from]/prices[to]<1?8:4)} ${to.toUpperCase()}`;
  $('fromUsd').textContent=`≈ ${money(n*prices[from])}`; $('toUsd').textContent=`≈ ${money(out*prices[to])}`;
}
['fromAmount','fromAsset','toAsset'].forEach(id=>$(id).addEventListener('input',quote));
$('flip').onclick=()=>{const a=$('fromAsset').value;$('fromAsset').value=$('toAsset').value;$('toAsset').value=a;quote()};
$('swapBtn').onclick=()=>{quote(); toast('Котировка обновлена. Для on-chain swap подключите TON-кошелёк.')};

// TON Connect: no private keys are exposed to the dApp.
let tonUI;
try {
  tonUI = new TON_CONNECT_UI.TonConnectUI({
    manifestUrl: location.origin + '/crypto-exchange/tonconnect-manifest.json',
    buttonRootId: 'tonConnect'
  });
  tonUI.onStatusChange(wallet => {
    if(wallet){ $('walletStatus').textContent='Подключён'; $('address').textContent=wallet.account.address; toast('TON-кошелёк подключён'); }
    else { $('walletStatus').textContent='Не подключён'; $('address').textContent='Подключите внешний TON-кошелёк'; }
  });
} catch(e) { console.warn(e); }
$('connectWallet').onclick=()=>tonUI?.openModal();

// Local TON wallet flow: derives an address only. The mnemonic is never uploaded or stored by this demo.
const modal=$('modal');
function openModal(mode){
  modal.classList.remove('hidden'); $('seedBox').classList.add('hidden'); $('walletAddress').classList.add('hidden'); $('seedInput').classList.add('hidden');
  $('modalTitle').textContent=mode==='new'?'Создать кошелёк':'Импортировать seed';
  $('modalText').textContent=mode==='new'?'Seed-фраза генерируется локально на устройстве.':'Введите seed-фразу локально. Она не отправляется на сервер.';
  $('modalPrimary').textContent=mode==='new'?'Сгенерировать':'Проверить seed';
  if(mode==='import') $('seedInput').classList.remove('hidden');
  $('modalPrimary').onclick=()=>mode==='new'?createLocalWallet():importLocalWallet();
}
async function createLocalWallet(){
  const words=await mnemonicNew(24); showWallet(words);
}
async function importLocalWallet(){
  const words=$('seedInput').value.trim().split(/\s+/).filter(Boolean);
  if(words.length!==24){toast('Нужна seed-фраза из 24 слов');return}
  try{ await mnemonicToPrivateKey(words); showWallet(words); }catch(e){toast('Seed-фраза не прошла проверку');}
}
async function showWallet(words){
  try{
    const kp=await mnemonicToPrivateKey(words);
    const wallet=WalletContractV4.create({workchain:0,publicKey:kp.publicKey});
    const address=wallet.address.toString({bounceable:false,urlSafe:true});
    $('seedBox').innerHTML=words.map((w,i)=>`<span>${i+1}. ${escapeHtml(w)}</span>`).join(''); $('seedBox').classList.remove('hidden'); $('walletAddress').textContent=address; $('walletAddress').classList.remove('hidden'); $('modalText').textContent='Сохрани фразу офлайн. Для этого прототипа она не записывается в сеть.'; $('modalPrimary').textContent='Готово'; $('modalPrimary').onclick=()=>{modal.classList.add('hidden'); $('address').textContent=address; toast('Адрес локального TON-кошелька рассчитан');};
  }catch(e){toast('Не удалось создать кошелёк')}
}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
$('createWalletBtn').onclick=()=>openModal('new'); $('newWallet').onclick=()=>openModal('new'); $('importWallet').onclick=()=>openModal('import'); $('closeModal').onclick=()=>modal.classList.add('hidden');
$('tgBtn').onclick=()=>toast('Telegram Login требует привязанный bot username + HTTPS domain');
loadPrices(); setInterval(loadPrices,60000); quote();
