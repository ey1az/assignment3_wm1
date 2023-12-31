import React, { useState, useEffect } from "react";
import Flashcards from "./Flashcards";
import CreateCard from "./CreateCard";
import "./CSS/FlashcardsPage.css";

const FlashcardsPage = () => {
  const [searchText, setSearchText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedSortOption, setSelectedSortOption] = useState("default");
  const [visibleFlashcards, setVisibleFlashcards] = useState([]);
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [currentCard, setCurrentCard] = useState(null);

  const handleStatusChange = (e) => {
    const status = e.target.value;
    setSelectedStatus(status);
  };

  const handleSortChange = (e) => {
    const sortOption = e.target.value;
    setSelectedSortOption(sortOption);
  };

  const getSortingFunction = () => {
    switch (selectedSortOption) {
      case "ID":
        return (f1, f2) => f1.id - f2.id;
      case "Question":
        return (f1, f2) => f1.questionTitle.localeCompare(f2.questionTitle);
      case "Answer":
        return (f1, f2) => f1.questionAnswer.localeCompare(f2.questionAnswer);
      case "Date":
        return (f1, f2) => new Date(f2.questionDate) - new Date(f1.questionDate);
      default:
        return (f1, f2) => f1.questionOrder - f2.questionOrder;
    }
  };

  const handleCardSelect = (cardId) => {
    setSelectedCards((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(cardId)) {
        newSelected.delete(cardId);
      } else {
        newSelected.add(cardId);
      }
      return newSelected;
    });
  };

  const handleShareSelected = () => {
    const selectedCardDetails = filteredFlashCards
      .filter((card) => selectedCards.has(card.id))
      .map(({ id, questionTitle, questionAnswer, questionOptions, questionDate, questionStatus }) => ({
        id,
        questionTitle,
        questionAnswer,
        questionOptions,
        questionDate,
        questionStatus
      }));

    const jsonData = JSON.stringify(selectedCardDetails, null, 2);
    const mailtoLink = `mailto:?subject=Flashcards Details&body=${encodeURIComponent(jsonData)}`;
    window.open(mailtoLink, '_blank');
    setSelectedCards(new Set());
  };

  useEffect(() => {
    const fetchAllFlashcards = async () => {
      try {
        const response = await fetch(
          `http://localhost:3002/flashCards`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch flashcards. Server responded with ${response.status}`);
        }

        const allFlashcards = await response.json();
        setVisibleFlashcards(allFlashcards);
      } catch (error) {
        console.error("Error fetching flashcards:", error);
      }
    };

    fetchAllFlashcards();
  }, []);

  const filteredFlashCards = visibleFlashcards
    .filter((flashCard) => {
      const searchString = searchText.toLowerCase();

      return (
        flashCard.questionTitle.toLowerCase().includes(searchString) ||
        flashCard.questionOptions.some((option) => option.toLowerCase().includes(searchString)) ||
        flashCard.questionAnswer.toLowerCase().includes(searchString)
      );
    })
    .filter((flashCard) => {
      if (selectedStatus === "all") {
        return true;
      } else {
        return flashCard.questionStatus === selectedStatus;
      }
    })
    .sort(getSortingFunction());

  const updateFlashcardsDnD = async (currentCard, targetCard) => {
    try {
      if (!currentCard || !targetCard) {
        console.error('Error: Invalid dragged or target card');
        return;
      }

      if (currentCard.questionOrder === undefined || targetCard.questionOrder === undefined) {
        console.error('Error: Missing questionOrder property in dragged or target card');
        return;
      }

      const updateCurrentCardResponse = await fetch(`http://localhost:3002/flashCards/${currentCard.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ questionOrder: targetCard.questionOrder }),
      });

      if (!updateCurrentCardResponse.ok) {
        const errorText = await updateCurrentCardResponse.text();
        throw new Error(`Failed to update dragged card. Server responded with ${updateCurrentCardResponse.status}: ${errorText}`);
      }

      const updateTargetCardResponse = await fetch(`http://localhost:3002/flashCards/${targetCard.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ questionOrder: currentCard.questionOrder }),
      });

      if (!updateTargetCardResponse.ok) {
        const errorText = await updateTargetCardResponse.text();
        throw new Error(`Failed to update target card. Server responded with ${updateTargetCardResponse.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('Error updating flashcards:', error.message);
    }
  };

  function dragStartHandler(flashCard) {
    if (selectedSortOption !== "default") {
      alert("Sort by Personal Order to rearrange cards by dragging and dropping.");
      return;
    }

    setCurrentCard(flashCard);
  }

  function dragOverHandler(e) {
    e.preventDefault();
  }

  function dropHandler(e, targetCard) {
    e.preventDefault();

    if (!currentCard || !targetCard || currentCard.id === targetCard.id) {
      setCurrentCard(null);
      return;
    }

    const updatedFlashcards = visibleFlashcards.map((c) => {
      if (c.id === targetCard.id) {
        return { ...c, questionOrder: currentCard.questionOrder };
      }
      if (c.id === currentCard.id) {
        return { ...c, questionOrder: targetCard.questionOrder };
      }
      return c;
    });

    updateFlashcardsDnD(currentCard, targetCard);

    setVisibleFlashcards(updatedFlashcards);
    setCurrentCard(null);
  }

  const updateFlashcard = (updatedCard) => {
    setVisibleFlashcards((prevVisible) =>
      prevVisible.map((prevCard) =>
        prevCard.id === updatedCard.id ? updatedCard : prevCard
      )
    );
  };

  const handleDeleteCard = (deletedCardId) => {
    setVisibleFlashcards((prevVisible) => prevVisible.filter((card) => card.id !== deletedCardId));
  };

  const handleCardAdded = (newCard) => {
    setVisibleFlashcards((prevVisible) => [...prevVisible, newCard]);
  };

  return (
    <div>
      <CreateCard
        onCardAdded={handleCardAdded}
      />
      <div className="filter-opt">
        <label className="filter-opt-select">
          Filter by Status:
          <select id="statusFilter" onChange={handleStatusChange}>
            <option value="all">All</option>
            <option value="Want to Learn">Want to Learn</option>
            <option value="Noted">Noted</option>
            <option value="Learned">Learned</option>
          </select>
        </label>
        <label>
          Sort by:
          <select id="sortFilter" onChange={handleSortChange}>
            <option value="default">Personal Order</option>
            <option value="Date">Date</option>
            <option value="ID">ID</option>
            <option value="Question">Question</option>
            <option value="Answer">Answer</option>
          </select>
        </label>
      </div>
      <div className="search-bar">
        <input
          id="searchFlashcards"
          type="text"
          placeholder="Search flashcards..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>
      <div className="share-button">
        {selectedCards.size > 0 && (
          <button onClick={handleShareSelected}>Share Selected</button>
        )}
      </div>
      <div className="card-cont">
        {filteredFlashCards.map((flashCard) => (
          <div
            draggable={true}
            onDragStart={() => dragStartHandler(flashCard)}
            onDragOver={(e) => dragOverHandler(e)}
            onDrop={(e) => dropHandler(e, flashCard)}
            key={flashCard.id} className="flashcard-item">
            <input
              type="checkbox"
              id={`flashcardCheckbox-${flashCard.id}`}
              className="flashcard-checkbox"
              checked={selectedCards.has(flashCard.id)}
              onChange={() => handleCardSelect(flashCard.id)}
            />
            <Flashcards
              key={flashCard.id}
              flashCard={flashCard}
              updateFlashcard={updateFlashcard}
              handleDeleteCard={handleDeleteCard}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default FlashcardsPage;