$P = "C:\Users\user\Desktop\mandeles-next"

$schema = @'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            Int       @id @default(autoincrement())
  name          String
  email         String?   @unique
  phone         String?   @unique
  pwHash        String?
  provider      String    @default("local")
  providerId    String?
  emailVerified Boolean   @default(false)
  phoneVerified Boolean   @default(false)
  active        Boolean   @default(true)
  createdAt     DateTime  @default(now())
  lastLogin     DateTime?
  wallet        Wallet?
  walletTxs     WalletTx[]
  subscriptions Subscription[]
  lottoSets     LottoSet[]
  lottoOrders   LottoOrder[]
  wins          Win[]
  authLogs      AuthLog[]
  resetTokens   ResetToken[]
  @@map("users")
}

model Wallet {
  userId     Int      @id
  balanceIls Float    @default(0)
  updatedAt  DateTime @updatedAt
  user       User     @relation(fields: [userId], references: [id])
  @@map("wallet")
}

model WalletTx {
  id          Int      @id @default(autoincrement())
  userId      Int
  type        String
  amountIls   Float
  description String?
  refId       String?
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id])
  @@map("wallet_tx")
}

model Subscription {
  id        Int        @id @default(autoincrement())
  userId    Int
  type      String
  priceIls  Float
  stripeId  String?
  status    String     @default("active")
  startsAt  DateTime
  expiresAt DateTime
  createdAt DateTime   @default(now())
  user      User       @relation(fields: [userId], references: [id])
  lottoSets LottoSet[]
  @@map("subscriptions")
}

model LottoSet {
  id             Int           @id @default(autoincrement())
  userId         Int
  subscriptionId Int?
  drawDate       String
  setIndex       Int
  n1             Int
  n2             Int
  n3             Int
  n4             Int
  n5             Int
  n6             Int
  strong         Int
  createdAt      DateTime      @default(now())
  user           User          @relation(fields: [userId], references: [id])
  subscription   Subscription? @relation(fields: [subscriptionId], references: [id])
  @@map("lotto_sets")
}

model LottoOrder {
  id            Int      @id @default(autoincrement())
  orderNumber   String   @unique
  userId        Int
  drawDate      String
  tablesCount   Int
  tablePriceIls Float
  commissionIls Float
  totalIls      Float
  status        String   @default("paid")
  setsJson      String?
  notes         String?
  isDouble      Boolean  @default(false)
  lotteryId     Int?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  user          User     @relation(fields: [userId], references: [id])
  wins          Win[]
  @@map("lotto_orders")
}

model WinCheck {
  id            Int      @id @default(autoincrement())
  drawDate      String
  drawNumbers   String
  checkedAt     DateTime @default(now())
  totalWins     Int      @default(0)
  totalPrizeIls Float    @default(0)
  wins          Win[]
  @@map("win_checks")
}

model Win {
  id        Int        @id @default(autoincrement())
  checkId   Int
  userId    Int
  orderId   Int
  setIndex  Int
  prizeRank Int
  prizeType String
  prizeIls  Float
  drawDate  String
  notified  Boolean    @default(false)
  check     WinCheck   @relation(fields: [checkId], references: [id])
  user      User       @relation(fields: [userId], references: [id])
  order     LottoOrder @relation(fields: [orderId], references: [id])
  @@map("wins")
}

model ResetToken {
  id        Int      @id @default(autoincrement())
  userId    Int
  token     String   @unique
  expiresAt DateTime
  used      Boolean  @default(false)
  user      User     @relation(fields: [userId], references: [id])
  @@map("reset_tokens")
}

model AuthLog {
  id        Int      @id @default(autoincrement())
  userId    Int?
  event     String
  ip        String?
  userAgent String?
  createdAt DateTime @default(now())
  user      User?    @relation(fields: [userId], references: [id])
  @@map("auth_log")
}
'@

Set-Content -Path "$P\prisma\schema.prisma" -Value $schema -Encoding UTF8
$c = Get-Content "$P\prisma\schema.prisma" -Raw
[System.IO.File]::WriteAllText("$P\prisma\schema.prisma", $c, [System.Text.UTF8Encoding]::new($false))
Write-Host "Done!"