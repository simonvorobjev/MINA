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
  @state(Bool) turnPlayer1 = State<Bool>();
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
    this.turnPlayer1.set(new Bool(false));
    this.bet.set(new Field(10));
  }

  @method rollOnce(randomNumber: Field) {
    const currentRoll = this.roll.get();
    const nextRoll = randomNumber;
    this.roll.set(nextRoll);
    if (currentRoll !== Field(1))
    {
      this.turnPlayer1.set(this.turnPlayer1.get().not());
    }
  }
}

export async function playDeathroll (
  zkAppInstance: Deathroll,
  zkAppPrivkey: PrivateKey,
  player1: PrivateKey,
  player2: PrivateKey,
)
{
  while (true)
  {
    const randomNumber = (Math.floor(Math.random() * 1000)) % Number(zkAppInstance.roll.get().toBigInt()) + 1;
    console.log("randomNumber: ", randomNumber);
    const randomField = new Field(randomNumber);
    const txnTurn = await Mina.transaction(zkAppPrivkey, async () => {
      zkAppInstance.rollOnce(randomField);
    });
    zkAppInstance.roll.get()
    await txnTurn.prove();
    txnTurn.send();
    const currentRoll = Number(zkAppInstance.roll.get().toBigInt());
    console.log("current roll: ", currentRoll);
    if (currentRoll === 1)
    {
      const turnPlayer1 = zkAppInstance.turnPlayer1.get();
      console.log('Player ', turnPlayer1 ? '1 win' : '2 win');
      const txnPay = await Mina.transaction(player1, async () => {
        const bet = new UInt64(zkAppInstance.bet.get());
        let p1 = Party.createSigned(player1);
        let p2 = Party.createSigned(player2);
        if (turnPlayer1)
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
      txnPay.send();
      break;
    }
  }

  const p1 = await Mina.getAccount(player1.toPublicKey());
  console.log('Player 1 balance', p1.balance.toString());

  const p2 = await Mina.getAccount(player2.toPublicKey());
  console.log('Player 2 balance', p2.balance.toString());
}