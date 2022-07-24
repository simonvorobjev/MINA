import {
  Field,
  Bool,
  SmartContract,
  state,
  State,
  method,
  DeployArgs,
  Permissions,
  Party,
  Mina,
  PrivateKey,
  PublicKey,
  UInt64
} from 'snarkyjs';

export class Deathroll extends SmartContract {
  @state(Field) roll = State<Field>();
  @state(Field) turn = State<Bool>();
  @state(Field) bet = State<Field>();

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
      send: Permissions.proofOrSignature()
    });
  }

  @method init() {
    this.roll.set(new Field(1000));
    //this.turn.set(new Bool(false));
    //this.bet.set(new Field(10));
  }

  @method rollOnce() {
    const currentRoll = this.roll.get();
    //const nextRoll = Math.floor(Math.random() * Number(currentRoll)) + 1;
    const nextRoll = Math.floor(Number(currentRoll.toBigInt())) + 1;
    //const nextRoll = Number(currentRoll.toBigInt());
    //nextRoll = 1;
    //let nextRoll = 1;
    //this.roll.set(new Field(nextRoll));
    //const turn = this.turn.get();
    //this.turn.set(new Bool(false));
  }
}

export async function playDeathroll (
  zkAppInstance: Deathroll,
  zkAppPrivkey: PrivateKey,
  player1: PrivateKey,
  player2: PrivateKey,
)
{
  const currentTurn = zkAppInstance.turn.get();
  while (true)
  {
    const txnTurn = await Mina.transaction(zkAppPrivkey, async () => {
      zkAppInstance.rollOnce();
      zkAppInstance.sign(zkAppPrivkey);
    });
    txnTurn.send();
    const currentRoll = Number(zkAppInstance.roll.get().toBigInt());
    console.log("current roll: ", currentRoll)
    if (currentRoll === 1)
    {
      const txnPay = await Mina.transaction(zkAppPrivkey, async () => {
        const bet = new UInt64(zkAppInstance.bet.get());
        let p1 = Party.createSigned(zkAppPrivkey);
        let p2 = Party.createSigned(zkAppPrivkey);
        if (currentTurn)
        {
              p1.balance.subInPlace(bet);
              p2.balance.addInPlace(bet);
        }
        else
        {
              p1.balance.subInPlace(bet);
              p2.balance.addInPlace(bet);
        }
        zkAppInstance.sign(zkAppPrivkey);
      });
      txnPay.send();
      break;
    }
  }
  const p1 = await Mina.getAccount(player1.toPublicKey());
  console.log('Player 1 balance', p1.balance.toString());

  const p2 = await Mina.getAccount(player2.toPublicKey());
  console.log('Player 2 balance', p2.balance.toString());
}