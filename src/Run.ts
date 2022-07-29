import { Field, PrivateKey, Mina, shutdown, isReady, Party, Signature } from 'snarkyjs';
import { Deathroll, playDeathroll } from './Deathroll.js';

function createLocalBlockchain(): PrivateKey[] {
  let Local = Mina.LocalBlockchain();
  Mina.setActiveInstance(Local);
  return [Local.testAccounts[0].privateKey, Local.testAccounts[1].privateKey, Local.testAccounts[2].privateKey];
}

export async function deploy(
    zkAppInstance: Deathroll,
    zkAppPrivkey: PrivateKey,
    deployer: PrivateKey
  ) {
    const txn = await Mina.transaction(deployer, () => {
      Party.fundNewAccount(deployer);
      zkAppInstance.deploy({ zkappKey: zkAppPrivkey });
      zkAppInstance.init();
    });
    txn.send();
  }

async function play() {
  await isReady;

  const [player1, player2, deployer] = createLocalBlockchain();
  const player1Public = player1.toPublicKey();
  const player2Public = player2.toPublicKey();

  const zkAppPrivkey = PrivateKey.random();
  const zkAppPubkey = zkAppPrivkey.toPublicKey();
  const zkAppInstance = new Deathroll(zkAppPubkey);
  console.log('compile');
  await Deathroll.compile(zkAppPubkey);
  // Create a new instance of the contract
  console.log('\n\n====== DEPLOYING ======\n\n');
  await deploy(zkAppInstance, zkAppPrivkey, deployer);

  console.log('after transaction');

  console.log("current roll: ", zkAppInstance.roll.get());
  console.log("current turn: ", zkAppInstance.turnPlayer1.get() ? 'Player 1' : 'Player 2');

  playDeathroll(zkAppInstance, zkAppPrivkey, player1, player2);
  zkAppInstance.sign(zkAppPrivkey);

  console.log("current roll: ", zkAppInstance.roll.get());
  console.log("current turn: ", zkAppInstance.turnPlayer1.get() ? 'Player 1' : 'Player 2');
}

play();