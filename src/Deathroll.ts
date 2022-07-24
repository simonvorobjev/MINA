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

  @method rollOnce(randomNumber: Field) {
    const currentRoll = this.roll.get();
    const nextRoll = currentRoll.mul(randomNumber).add(1);
    this.roll.set(nextRoll);
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
    const randomNumber = new Field(Math.floor(Math.random()));
    const txnTurn = await Mina.transaction(zkAppPrivkey, async () => {
      zkAppInstance.rollOnce(randomNumber);
    });
    await txnTurn.prove();
    txnTurn.send();
    const currentRoll = Number(zkAppInstance.roll.get().toBigInt());
    console.log("current roll: ", currentRoll)
    if (currentRoll === 1)
    {
      const txnPay = await Mina.transaction(player1, async () => {
        const bet = new UInt64(zkAppInstance.bet.get());
        let p1 = Party.createSigned(player1);
        let p2 = Party.createSigned(player1);
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
      });
      await txnPay.prove();
      txnPay.send();
      break;
    }
  }
  const p1 = await Mina.getAccount(player1.toPublicKey());
  console.log('Player 1 balance', p1.balance.toString());

  const p2 = await Mina.getAccount(player2.toPublicKey());
  console.log('Player 2 balance', p2.balance.toString());
}