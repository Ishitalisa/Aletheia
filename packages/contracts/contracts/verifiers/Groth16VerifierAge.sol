// GENERATED FILE — DO NOT EDIT.
// snarkjs groth16 verifier for circuits/age.circom, exported by
// scripts/export-verifier.ts. The only change from snarkjs's output is the
// contract name (Groth16Verifier -> Groth16VerifierAge).
//
// Regenerating this file after a new trusted setup invalidates any deployed copy:
// the verification key is baked into the constants below.
// SPDX-License-Identifier: GPL-3.0
/*
    Copyright 2021 0KIMS association.

    This file is generated with [snarkJS](https://github.com/iden3/snarkjs).

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity >=0.7.0 <0.9.0;

contract Groth16VerifierAge {
    // Scalar field size
    uint256 constant r    = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant q   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax  = 19359279875810426362537207554212387635939483263520931188920277025178321234033;
    uint256 constant alphay  = 19788141401129681802948888153764963967446376554530989149774944813779849029581;
    uint256 constant betax1  = 13528330386313408970433696105868645005697656257159829832200334095357144185325;
    uint256 constant betax2  = 18702561205799305398015502495232022856177676087776911795571818686742696591044;
    uint256 constant betay1  = 16987845408927322905341890019119004200142833951052451019332276036229226804642;
    uint256 constant betay2  = 14319824683979996084444695676834302283263981740667114763699122984069675047677;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 9023633593936624153969146741218571217272593699750128889615153797034677392953;
    uint256 constant deltax2 = 3752286529219753774696012367241827086754955877500511906677195886338778620909;
    uint256 constant deltay1 = 17907705771298289050328301712488538933828231287425220424947739173253574273605;
    uint256 constant deltay2 = 3464288569508526634653532003707267751070989445142378211005619401100254245827;

    
    uint256 constant IC0x = 14619101371234773437064594703672037074464861857650113204700493347916098140834;
    uint256 constant IC0y = 880595284084330206593558958077937026436755109995453319345585678791563576403;
    
    uint256 constant IC1x = 6948821547879653707572180286286261672517231085757604108400186676785975751377;
    uint256 constant IC1y = 20871425537673445169545307722415642135215533542204462680460345827167324217695;
    
    uint256 constant IC2x = 2358135299341532622616362581120754757635517150341793512022730968556930336422;
    uint256 constant IC2y = 20918010063152017662339297754306339211312888068835258772086365482877314818645;
    
    uint256 constant IC3x = 16598459228214799102565210237155855357706301375519523229683123063961624895316;
    uint256 constant IC3y = 9081469407722699747145554794508401670445740694766517346440920802153462563497;
    
    uint256 constant IC4x = 2687574225843867066557577950073248365501061233695294853646725567554379242484;
    uint256 constant IC4y = 19802657867233674944537495212023935513760113137524271544781693015556511393944;
    
    uint256 constant IC5x = 4572068751072364478580208467552211469173610753687992372107718283490934485961;
    uint256 constant IC5y = 9659658761599226512229491399777011438311012359486898305169538663251993655266;
    
    uint256 constant IC6x = 789749937693449711471432578694111584686259776690737609370684502931062353377;
    uint256 constant IC6y = 18425585083675345262109186669285106691544540805880060950612143575927740042234;
    
    uint256 constant IC7x = 18240574561366008177250224866030849178505502521239203986098279301483251445522;
    uint256 constant IC7y = 10702913284438406160949299518342589095336040077031753671316550914929755710621;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[7] calldata _pubSignals) public view returns (bool) {
        assembly {
            function checkField(v) {
                if iszero(lt(v, r)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }
            
            // G1 function to multiply a G1 value(x,y) to value in an address
            function g1_mulAccC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn, 32), y)
                mstore(add(mIn, 64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }

                mstore(add(mIn, 64), mload(pR))
                mstore(add(mIn, 96), mload(add(pR, 32)))

                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function checkPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pPairing := add(pMem, pPairing)
                let _pVk := add(pMem, pVk)

                mstore(_pVk, IC0x)
                mstore(add(_pVk, 32), IC0y)

                // Compute the linear combination vk_x
                
                g1_mulAccC(_pVk, IC1x, IC1y, calldataload(add(pubSignals, 0)))
                
                g1_mulAccC(_pVk, IC2x, IC2y, calldataload(add(pubSignals, 32)))
                
                g1_mulAccC(_pVk, IC3x, IC3y, calldataload(add(pubSignals, 64)))
                
                g1_mulAccC(_pVk, IC4x, IC4y, calldataload(add(pubSignals, 96)))
                
                g1_mulAccC(_pVk, IC5x, IC5y, calldataload(add(pubSignals, 128)))
                
                g1_mulAccC(_pVk, IC6x, IC6y, calldataload(add(pubSignals, 160)))
                
                g1_mulAccC(_pVk, IC7x, IC7y, calldataload(add(pubSignals, 192)))
                

                // -A
                mstore(_pPairing, calldataload(pA))
                mstore(add(_pPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

                // B
                mstore(add(_pPairing, 64), calldataload(pB))
                mstore(add(_pPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pPairing, 160), calldataload(add(pB, 96)))

                // alpha1
                mstore(add(_pPairing, 192), alphax)
                mstore(add(_pPairing, 224), alphay)

                // beta2
                mstore(add(_pPairing, 256), betax1)
                mstore(add(_pPairing, 288), betax2)
                mstore(add(_pPairing, 320), betay1)
                mstore(add(_pPairing, 352), betay2)

                // vk_x
                mstore(add(_pPairing, 384), mload(add(pMem, pVk)))
                mstore(add(_pPairing, 416), mload(add(pMem, add(pVk, 32))))


                // gamma2
                mstore(add(_pPairing, 448), gammax1)
                mstore(add(_pPairing, 480), gammax2)
                mstore(add(_pPairing, 512), gammay1)
                mstore(add(_pPairing, 544), gammay2)

                // C
                mstore(add(_pPairing, 576), calldataload(pC))
                mstore(add(_pPairing, 608), calldataload(add(pC, 32)))

                // delta2
                mstore(add(_pPairing, 640), deltax1)
                mstore(add(_pPairing, 672), deltax2)
                mstore(add(_pPairing, 704), deltay1)
                mstore(add(_pPairing, 736), deltay2)


                let success := staticcall(sub(gas(), 2000), 8, _pPairing, 768, _pPairing, 0x20)

                isOk := and(success, mload(_pPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            // Validate that all evaluations ∈ F
            
            checkField(calldataload(add(_pubSignals, 0)))
            
            checkField(calldataload(add(_pubSignals, 32)))
            
            checkField(calldataload(add(_pubSignals, 64)))
            
            checkField(calldataload(add(_pubSignals, 96)))
            
            checkField(calldataload(add(_pubSignals, 128)))
            
            checkField(calldataload(add(_pubSignals, 160)))
            
            checkField(calldataload(add(_pubSignals, 192)))
            

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }
