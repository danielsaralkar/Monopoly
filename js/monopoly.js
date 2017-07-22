var Monopoly = {};
Monopoly.allowRoll = true;
Monopoly.moneyAtStart = 200;
Monopoly.doubleCounter = 0;

//Initialize the Board before starting
Monopoly.init = function(){
    $(document).ready(function(){
        Monopoly.adjustBoardSize();
        $(window).bind("resize",Monopoly.adjustBoardSize);
        Monopoly.initDice();
        Monopoly.initPopups();
        Monopoly.start();        
    });
};

//Start the Game and show intro pop-up
Monopoly.start = function(){
    Monopoly.showPopup("intro")
};

//Initialize the Dice
Monopoly.initDice = function(){
    $(".dice").click(function(){
        if (Monopoly.allowRoll){
            Monopoly.rollDice();
        }
    });
};

//Get the object of current player
Monopoly.getCurrentPlayer = function(){
    return $(".player.current-turn");
};

//Get location of player
Monopoly.getPlayersCell = function(player){
    return player.closest(".cell");
};

//Get the players present money
Monopoly.getPlayersMoney = function(player){
    return parseInt(player.attr("data-money"));
};

//Updating players money
Monopoly.updatePlayersMoney = function(player,amount){
    var playersMoney = parseInt(player.attr("data-money"));
    playersMoney -= amount;
    if (playersMoney < 0 ){
            var popup = Monopoly.getPopup("broke");
            popup.find("button").unbind("click").bind("click",function(){
                Monopoly.handleAction(player,"remove");
                Monopoly.closeBrokePopup();
            });
            Monopoly.showPopup("broke");
    }else{
        player.attr("data-money",playersMoney);
        player.attr("title",player.attr("id") + ": $" + playersMoney);
        var playerId = parseInt(player.attr("id").replace("player",""));
        $("#playerscore" + playerId + " .amountdata").text("$ " + playersMoney);
        Monopoly.playSound("chaching");
    }
};

//Rolling the dice
Monopoly.rollDice = function(){
    var result1 = Math.floor(Math.random() * 6) + 1;
    var result2 = Math.floor(Math.random() * 6) + 1;
    $(".dice").find(".dice-dot").css("opacity",0);
    $(".dice#dice1").attr("data-num",result1).find(".dice-dot.num" + result1).css("opacity",1);
    $(".dice#dice2").attr("data-num",result2).find(".dice-dot.num" + result2).css("opacity",1);
    if (result1 == result2){
        Monopoly.doubleCounter++;
    }
    else{
        Monopoly.doubleCounter = 0;
    }
    var currentPlayer = Monopoly.getCurrentPlayer();
    Monopoly.handleAction(currentPlayer, "move", result1 + result2);
};

//Move the current player as per the dice
Monopoly.movePlayer = function(player,steps){
    Monopoly.allowRoll = false;
    if(Monopoly.doubleCounter == 3){
        Monopoly.doubleCounter = 0;
        Monopoly.handleGoToJail(player);
    }
    else{
        var playerMovementInterval = setInterval(function(){
            if (steps == 0){
                clearInterval(playerMovementInterval);
                Monopoly.handleTurn(player);
            }else{
                var playerCell = Monopoly.getPlayersCell(player);
                var nextCell = Monopoly.getNextCell(playerCell);
                nextCell.find(".content").append(player);
                steps--;
            }
        },200);
    }
};

//Handle the turn action
Monopoly.handleTurn = function(){
    var player = Monopoly.getCurrentPlayer();
    var playerCell = Monopoly.getPlayersCell(player);
    if (playerCell.is(".available.property")){
        Monopoly.handleBuyProperty(player,playerCell);
    }else if(playerCell.is(".property:not(.available)") && !playerCell.hasClass(player.attr("id"))){
         Monopoly.handlePayRent(player,playerCell);
    }else if(playerCell.is(".go-to-jail")){
        Monopoly.handleGoToJail(player);
    }else if(playerCell.is(".chance")){
        Monopoly.handleChanceCard(player);
    }else if(playerCell.is(".community")){
        Monopoly.handleCommunityCard(player);
    }else{
        Monopoly.setNextPlayerTurn();
    }
}

//Set Next player skipping jailed and eliminated players
Monopoly.setNextPlayerTurn = function(){
    var currentPlayerTurn = Monopoly.getCurrentPlayer();
    if(Monopoly.doubleCounter > 0 && Monopoly.doubleCounter < 3){
        //Skip if player is jailed or removed on a double counter
        if (currentPlayerTurn.is(".jailed") || currentPlayerTurn.is(".removed")){
            Monopoly.doubleCounter = 0;
            Monopoly.setNextPlayerTurn();
            return;
        }
        Monopoly.closePopup();
        Monopoly.allowRoll = true;
    }
    //If there is no double counter
    else{
        var playerId = parseInt(currentPlayerTurn.attr("id").replace("player",""));
        var nextPlayerId = playerId + 1;
        if (nextPlayerId > $(".player").length){
            nextPlayerId = 1;
        }
        currentPlayerTurn.removeClass("current-turn");
        var nextPlayer = $(".player#player" + nextPlayerId);
        nextPlayer.addClass("current-turn");
        //Check if the next player is still jailed or removed
        if (nextPlayer.is(".jailed")){
            var currentJailTime = parseInt(nextPlayer.attr("data-jail-time"));
            currentJailTime++;
            nextPlayer.attr("data-jail-time",currentJailTime);
            if (currentJailTime > 3){
                nextPlayer.removeClass("jailed");
                nextPlayer.removeAttr("data-jail-time");
            }
            Monopoly.setNextPlayerTurn();
            return;
        }
        else if(nextPlayer.is(".removed")){
            Monopoly.setNextPlayerTurn();
            return;
        }
        Monopoly.closePopup();
        Monopoly.allowRoll = true;
    }
    Monopoly.checkWinCondition();
};

//Handle Buy Property if yes or no
Monopoly.handleBuyProperty = function(player,propertyCell){
    var propertyCost = Monopoly.calculateProperyCost(propertyCell);
    var popup = Monopoly.getPopup("buy");
    popup.find(".cell-price").text(propertyCost);
    popup.find("button").unbind("click").bind("click",function(){
        var clickedBtn = $(this);
        if (clickedBtn.is("#yes")){
            Monopoly.handleBuy(player,propertyCell,propertyCost);
        }else{
            Monopoly.closeAndNextTurn();
        }
    });
    Monopoly.showPopup("buy");
};

//Handle pay rent to other players
Monopoly.handlePayRent = function(player,propertyCell){
    var popup = Monopoly.getPopup("pay");
    var currentRent = parseInt(propertyCell.attr("data-rent"));
    var properyOwnerId = propertyCell.attr("data-owner");
    popup.find("#player-placeholder").text(properyOwnerId);
    popup.find("#amount-placeholder").text(currentRent);
    popup.find("button").unbind("click").bind("click",function(){
        var properyOwner = $(".player#"+ properyOwnerId);
        Monopoly.updatePlayersMoney(player,currentRent);
        Monopoly.updatePlayersMoney(properyOwner,-1*currentRent);
        Monopoly.closeAndNextTurn();
    });
   Monopoly.showPopup("pay");
};

//Send player to jail
Monopoly.handleGoToJail = function(player){
    var popup = Monopoly.getPopup("jail");
    popup.find("button").unbind("click").bind("click",function(){
        Monopoly.handleAction(player,"jail");
    });
    Monopoly.showPopup("jail");
};

//Get data from request in case of chance card
Monopoly.handleChanceCard = function(player){
    var popup = Monopoly.getPopup("chance");
    popup.find(".popup-content").addClass("loading-state");
    $.get("https://itcmonopoly.appspot.com/get_random_chance_card", function(chanceJson){
        popup.find(".popup-content #text-placeholder").text(chanceJson["content"]);
        popup.find(".popup-title").text(chanceJson["title"]);
        popup.find(".popup-content").removeClass("loading-state");
        popup.find(".popup-content button").attr("data-action",chanceJson["action"]).attr("data-amount",chanceJson["amount"]);
    },"json");
    popup.find("button").unbind("click").bind("click",function(){
        var currentBtn = $(this);
        var action = currentBtn.attr("data-action");
        var amount = currentBtn.attr("data-amount");
        Monopoly.handleAction(player,action,amount);
    });
    Monopoly.showPopup("chance");
};

//Get data from request in case of community card
Monopoly.handleCommunityCard = function(player){
    var popup = Monopoly.getPopup("community");
    popup.find(".popup-content").addClass("loading-state");
    $.get("https://itcmonopoly.appspot.com/get_random_community_card", function(communityJson){
        popup.find(".popup-content #text-placeholder").text(communityJson["content"]);
        popup.find(".popup-title").text(communityJson["title"]);
        popup.find(".popup-content").removeClass("loading-state");
        popup.find(".popup-content button").attr("data-action",communityJson["action"]).attr("data-amount",communityJson["amount"]);
    },"json");
    popup.find("button").unbind("click").bind("click",function(){
        var currentBtn = $(this);
        var action = currentBtn.attr("data-action");
        var amount = currentBtn.attr("data-amount");
        Monopoly.handleAction(player,action,amount);
    });
    Monopoly.showPopup("community");
};

// Send player to jail function
Monopoly.sendToJail = function(player){
    player.addClass("jailed");
    player.attr("data-jail-time",1);
    $(".corner.game.cell.in-jail").append(player);
    Monopoly.playSound("woopwoop");
    Monopoly.setNextPlayerTurn();
    Monopoly.closePopup();
};

//Get the required pop-up
Monopoly.getPopup = function(popupId){
    if(popupId === "broke"){
        return $(".popup-darkbox .popup-page#" + popupId);
    }else{
        return $(".popup-lightbox .popup-page#" + popupId);
    }
};

//Calculate property cost to buy
Monopoly.calculateProperyCost = function(propertyCell){
    var cellGroup = propertyCell.attr("data-group");
    var cellPrice = parseInt(cellGroup.replace("group","")) * 5;
    if (cellGroup == "rail"){
        cellPrice = 10;
    }
    return cellPrice;
};

//Calculate property rent of current property
Monopoly.calculateProperyRent = function(propertyCost){
    return propertyCost/2;
};

//Close pop up and set next player turn
Monopoly.closeAndNextTurn = function(){
    Monopoly.setNextPlayerTurn();
    Monopoly.closePopup();
};

//Check if num of players is valid and then call create player function
Monopoly.initPopups = function(){
    $(".popup-page#intro").find("button").click(function(){
        var numOfPlayers = $(this).closest(".popup-page").find("input").val();
        if (Monopoly.isValidInput("numofplayers",numOfPlayers)){
            Monopoly.createPlayers(numOfPlayers);
            Monopoly.closePopup();
        }
    });
};

//Handle property buy
Monopoly.handleBuy = function(player,propertyCell,propertyCost){
    var playersMoney = Monopoly.getPlayersMoney(player)
    if (playersMoney < propertyCost){
        Monopoly.showErrorMsg();
        Monopoly.playSound("nomoney");
    }else{
        Monopoly.updatePlayersMoney(player,propertyCost);
        var rent = Monopoly.calculateProperyRent(propertyCost);
        propertyCell.removeClass("available")
                    .addClass(player.attr("id"))
                    .attr("data-owner",player.attr("id"))
                    .attr("data-rent",rent);
        Monopoly.setNextPlayerTurn();
    }
};

//Handle various player actions like move, pay, jail, remove
Monopoly.handleAction = function(player,action,amount){
    switch(action){
        case "move":
            Monopoly.movePlayer(player,amount);
            break;
        case "pay":
            Monopoly.updatePlayersMoney(player,amount);
            Monopoly.setNextPlayerTurn();
            break;
        case "jail":
            Monopoly.sendToJail(player);
            break;
        case "remove":
            Monopoly.removePlayer(player);
            Monopoly.setNextPlayerTurn();
            break;
    };    
};

//Create the players
Monopoly.createPlayers = function(numOfPlayers){
    var startCell = $(".go");
    for (var i=1; i<= numOfPlayers; i++){
        var player = $("<div />").addClass("player shadowed").attr("id","player" + i).attr("title","player" + i + ": $" + Monopoly.moneyAtStart);
        var tr = $("<tr />").addClass("playerscore").attr("id","playerscore" + i);
        var tdname = $("<td />").addClass("playername").text("player" + i);
        var tdamount = $("<td />").addClass("amountdata").text("$ " + Monopoly.moneyAtStart);
        tr.append(tdname);
        tr.append(tdamount);
        $("#scoretable").append(tr);
        startCell.find(".content").append(player);
        if (i==1){
            player.addClass("current-turn");
        }
        player.attr("data-money",Monopoly.moneyAtStart);
    }
    $("#scoretable").show();
};

//Get the next cell DOM element
Monopoly.getNextCell = function(cell){
    var currentCellId = parseInt(cell.attr("id").replace("cell",""));
    var nextCellId = currentCellId + 1
    if (nextCellId > 40){
        Monopoly.handlePassedGo();
        nextCellId = 1;
    }
    return $(".cell#cell" + nextCellId);
};

//Handle if the player has passed the Go block and give him additional money
Monopoly.handlePassedGo = function(){
    var player = Monopoly.getCurrentPlayer();
    Monopoly.updatePlayersMoney(player,-Monopoly.moneyAtStart/10);
};

//Check if number of players passed by user is valid
Monopoly.isValidInput = function(validate,value){
    var isValid = false;
    switch(validate){
        case "numofplayers":
            if(value > 1 && value <= 6){
                isValid = true;
            }else{
                isValid = false;
            }
            break;
    }
    if (!isValid){
        Monopoly.showErrorMsg();
    }
    return isValid;
}

//Show error message if Input of user is Invalid
Monopoly.showErrorMsg = function(){
    $(".popup-page .invalid-error").fadeTo(500,1);
    setTimeout(function(){
            $(".popup-page .invalid-error").fadeTo(500,0);
    },2000);
};

//Adjust board size as per page size
Monopoly.adjustBoardSize = function(){
    var gameBoard = $(".board");
    var boardSize = Math.min($(window).height(),$(window).width());
    boardSize -= parseInt(gameBoard.css("margin-top")) *2;
    $(".board").css({"height":boardSize,"width":boardSize});
}

//Close the pop-ups
Monopoly.closePopup = function(){
    $(".popup-lightbox").fadeOut();
};

//Close the broke pop-up
Monopoly.closeBrokePopup = function(){
    $(".popup-darkbox").fadeOut();
}

//Function to play the sound
Monopoly.playSound = function(sound){
    var snd = new Audio("./sounds/" + sound + ".wav"); 
    snd.play();
}

//Show the required pop-ups
Monopoly.showPopup = function(popupId){
    $(".popup-lightbox .popup-page").hide();
    $(".popup-lightbox .popup-page#" + popupId).show();
    $(".popup-lightbox").fadeIn();
    if(popupId === "broke"){
        $(".popup-darkbox .popup-page#" + popupId).show();
        $(".popup-darkbox").fadeIn();
    }
};

//Remove the player who is broke
Monopoly.removePlayer = function(player){
    var playerId = player.attr("id");
    $("#" + playerId).addClass("removed");
    $("." + playerId).removeClass(playerId).addClass("available");
    $("#playerscore" + playerId.replace("player", "") + " .amountdata").text("Out");
}

//Check for win condition if all except one player have been kicked out
Monopoly.checkWinCondition = function(){
    var flag = 0;
    var player;
    for(var i=1; i <= $(".player").length; i++){
        if(!$(".player#player" + i).is(".removed")){
            flag++;
            player = $(".player#player" + i);
        }
    }
    if(flag === 1){
        var popup = Monopoly.getPopup("finish");
        popup.find("#player-placeholder").text(player.attr("id"));
        popup.find("button").unbind("click").bind("click",function(){
            location.reload();
        });
        Monopoly.showPopup("finish");
        Monopoly.allowRoll = false;
    }
}

//Initialize the function when page loads
Monopoly.init();